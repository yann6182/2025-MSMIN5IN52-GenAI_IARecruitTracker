from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from app.models.models import Application, ApplicationEvent
from app.models.schemas import (
    ApplicationCreate, ApplicationUpdate, ApplicationStatus,
    ApplicationEventCreate, EventType
)
from datetime import datetime, timedelta


class ApplicationService:
    def __init__(self, db: Session):
        self.db = db

    def get_applications(
        self, 
        skip: int = 0, 
        limit: int = 50, 
        status: Optional[str] = None,
        company: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[Application]:
        """
        Récupérer les candidatures avec filtres optionnels
        """
        query = self.db.query(Application)
        
        if status:
            query = query.filter(Application.status == status)
        
        if company:
            query = query.filter(Application.company_name.ilike(f"%{company}%"))
            
        if search_query:
            query = query.filter(
                (Application.job_title.ilike(f"%{search_query}%")) |
                (Application.company_name.ilike(f"%{search_query}%")) |
                (Application.notes.ilike(f"%{search_query}%"))
            )
        
        return query.order_by(Application.updated_at.desc()).offset(skip).limit(limit).all()

    def create_application(self, application: ApplicationCreate) -> Application:
        """
        Créer une nouvelle candidature
        """
        # Définir la prochaine action par défaut (7 jours après la candidature)
        next_action_at = application.next_action_at or (datetime.utcnow() + timedelta(days=7))
        
        db_application = Application(
            job_title=application.job_title,
            company_name=application.company_name,
            source=application.source,
            location=application.location,
            status=application.status,
            notes=application.notes,
            next_action_at=next_action_at
        )
        
        self.db.add(db_application)
        self.db.commit()
        self.db.refresh(db_application)
        
        # Créer un événement pour la création
        self._create_event(
            db_application.id,
            EventType.STATUS_CHANGE,
            {
                "previous_status": None,
                "new_status": application.status.value,
                "action": "application_created"
            }
        )
        
        return db_application

    def get_application_full(self, application_id: UUID):
        """
        Récupérer une candidature avec ses événements et emails
        """
        return self.db.query(Application)\
            .filter(Application.id == application_id)\
            .first()

    def update_application(self, application_id: UUID, application_update: ApplicationUpdate):
        """
        Mettre à jour une candidature
        """
        db_application = self.db.query(Application)\
            .filter(Application.id == application_id)\
            .first()
        
        if not db_application:
            return None
        
        update_data = application_update.model_dump(exclude_unset=True)
        previous_status = db_application.status
        
        for field, value in update_data.items():
            setattr(db_application, field, value)
        
        db_application.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(db_application)
        
        # Créer un événement si le statut a changé
        if "status" in update_data and previous_status != db_application.status:
            self._create_event(
                application_id,
                EventType.STATUS_CHANGE,
                {
                    "previous_status": previous_status,
                    "new_status": db_application.status,
                    "action": "status_updated"
                }
            )
        
        return db_application

    def delete_application(self, application_id: UUID) -> bool:
        """
        Supprimer une candidature
        """
        db_application = self.db.query(Application)\
            .filter(Application.id == application_id)\
            .first()
        
        if not db_application:
            return False
        
        self.db.delete(db_application)
        self.db.commit()
        return True

    def get_application_events(self, application_id: UUID):
        """
        Récupérer les événements d'une candidature
        """
        # Vérifier que la candidature existe
        application = self.db.query(Application)\
            .filter(Application.id == application_id)\
            .first()
        
        if not application:
            return None
        
        events = self.db.query(ApplicationEvent)\
            .filter(ApplicationEvent.application_id == application_id)\
            .order_by(ApplicationEvent.created_at.desc())\
            .all()
        
        return [
            {
                "id": event.id,
                "event_type": event.event_type,
                "payload": event.payload,
                "created_at": event.created_at
            }
            for event in events
        ]

    def get_applications_summary(self):
        """
        Récupérer un résumé statistique des candidatures
        """
        # Comptage par statut
        status_counts = self.db.query(
            Application.status,
            func.count(Application.id).label('count')
        ).group_by(Application.status).all()
        
        # Total des candidatures
        total = self.db.query(func.count(Application.id)).scalar()
        
        # Candidatures avec prochaine action en retard
        overdue_count = self.db.query(func.count(Application.id))\
            .filter(Application.next_action_at < datetime.utcnow())\
            .filter(Application.status.in_(['APPLIED', 'ACKNOWLEDGED', 'SCREENING']))\
            .scalar()
        
        return {
            "total": total,
            "status_breakdown": {status: count for status, count in status_counts},
            "overdue_actions": overdue_count
        }

    def _create_event(self, application_id: UUID, event_type: EventType, payload: dict):
        """
        Créer un événement pour une candidature
        """
        event = ApplicationEvent(
            application_id=application_id,
            event_type=event_type.value,
            payload=payload
        )
        self.db.add(event)
        self.db.commit()
