from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.models import User
from app.services.intelligent_application_tracker import IntelligentApplicationTracker
from app.api.v1.endpoints.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/process-emails", response_model=Dict[str, Any])
def process_emails_for_applications(
    limit: int = Query(50, description="Nombre maximum d'emails à traiter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lance l'analyse intelligente des emails pour détecter et mettre à jour les candidatures.
    
    Cette endpoint fonctionne comme un Excel intelligent qui:
    - Analyse automatiquement les emails entrants de l'utilisateur connecté
    - Crée de nouvelles candidatures quand nécessaire
    - Met à jour les statuts des candidatures existantes
    - Extrait automatiquement les informations pertinentes
    """
    try:
        tracker = IntelligentApplicationTracker(db)
        results = tracker.process_email_batch(user_id=current_user.id, limit=limit)
        
        logger.info(f"Traitement terminé pour l'utilisateur {current_user.email}: {results['processed_emails']} emails traités, "
                   f"{results['created_applications']} candidatures créées, "
                   f"{results['updated_applications']} candidatures mises à jour")
        
        return {
            "success": True,
            "message": "Traitement des emails terminé avec succès",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Erreur lors du traitement des emails pour {current_user.email}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du traitement des emails: {str(e)}"
        )


@router.get("/processing-summary", response_model=Dict[str, Any])
def get_processing_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère un résumé des traitements effectués récemment pour l'utilisateur connecté.
    """
    try:
        tracker = IntelligentApplicationTracker(db)
        summary = tracker.get_processing_summary(user_id=current_user.id)
        
        return {
            "success": True,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du résumé pour {current_user.email}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération du résumé: {str(e)}"
        )


@router.post("/auto-process", response_model=Dict[str, Any])
def enable_auto_processing(
    enabled: bool = Query(True, description="Activer/désactiver le traitement automatique"),
    interval_minutes: int = Query(15, description="Intervalle en minutes pour le traitement automatique"),
    db: Session = Depends(get_db)
):
    """
    Active ou désactive le traitement automatique des emails.
    
    Quand activé, le système analysera automatiquement les nouveaux emails
    et mettra à jour les candidatures selon l'intervalle spécifié.
    """
    try:
        # Pour l'instant, nous retournons juste la configuration
        # Dans une implémentation complète, on utiliserait Celery ou un scheduler
        
        return {
            "success": True,
            "message": f"Traitement automatique {'activé' if enabled else 'désactivé'}",
            "config": {
                "enabled": enabled,
                "interval_minutes": interval_minutes,
                "next_run": "Non implémenté dans cette version"
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la configuration automatique: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la configuration: {str(e)}"
        )


@router.get("/application-insights/{application_id}", response_model=Dict[str, Any])
def get_application_insights(
    application_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtient des insights détaillés sur une candidature spécifique.
    
    Retourne:
    - Historique des emails liés
    - Progression des statuts
    - Informations extraites automatiquement
    - Recommandations d'actions
    """
    try:
        from app.models.models import Application, Email
        
        # Récupérer la candidature
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Candidature non trouvée")
        
        # Récupérer les emails liés
        linked_emails = db.query(Email).filter(Email.application_id == application_id).all()
        
        # Analyser la progression
        email_timeline = []
        for email in sorted(linked_emails, key=lambda x: x.received_date):
            email_timeline.append({
                "date": email.received_date.isoformat(),
                "subject": email.subject,
                "sender": email.sender,
                "classification": email.classification,
                "snippet": email.snippet[:100] if email.snippet else None
            })
        
        # Calculer des métriques
        response_times = []
        if len(linked_emails) > 1:
            for i in range(1, len(linked_emails)):
                prev_date = linked_emails[i-1].received_date
                curr_date = linked_emails[i].received_date
                diff = (curr_date - prev_date).days
                response_times.append(diff)
        
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Générer des recommandations
        recommendations = []
        
        # Si pas de réponse depuis longtemps
        if linked_emails:
            last_email_date = max(email.received_date for email in linked_emails)
            days_since_last = (datetime.utcnow() - last_email_date).days
            
            if days_since_last > 7 and application.status not in ['REJECTED', 'ACCEPTED']:
                recommendations.append({
                    "type": "follow_up",
                    "message": f"Aucune nouvelle depuis {days_since_last} jours. Considérer un suivi.",
                    "priority": "medium"
                })
        
        # Si entretien programmé mais pas de date
        if application.status == 'INTERVIEW' and not application.interview_date:
            recommendations.append({
                "type": "missing_date",
                "message": "Statut entretien détecté mais aucune date programmée.",
                "priority": "high"
            })
        
        return {
            "success": True,
            "data": {
                "application": {
                    "id": application.id,
                    "job_title": application.job_title,
                    "company_name": application.company_name,
                    "status": application.status,
                    "created_date": application.created_at.isoformat(),
                    "last_update": application.updated_at.isoformat()
                },
                "email_count": len(linked_emails),
                "email_timeline": email_timeline,
                "metrics": {
                    "average_response_time_days": round(avg_response_time, 1),
                    "total_interactions": len(linked_emails),
                    "days_since_last_contact": days_since_last if linked_emails else None
                },
                "recommendations": recommendations
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des insights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des insights: {str(e)}"
        )


@router.post("/simulate-excel-import", response_model=Dict[str, Any])
def simulate_excel_import(
    company_filter: Optional[str] = Query(None, description="Filtrer par entreprise"),
    status_filter: Optional[str] = Query(None, description="Filtrer par statut"),
    db: Session = Depends(get_db)
):
    """
    Simule un export Excel des candidatures avec toutes les données extraites automatiquement.
    
    Retourne les données dans un format qui pourrait être exporté vers Excel,
    avec toutes les informations extraites automatiquement des emails.
    """
    try:
        from app.models.models import Application, Email
        
        # Construire la requête avec filtres
        query = db.query(Application)
        
        if company_filter:
            query = query.filter(Application.company_name.ilike(f"%{company_filter}%"))
        
        if status_filter:
            query = query.filter(Application.status == status_filter)
        
        applications = query.all()
        
        # Construire les données style Excel
        excel_data = []
        
        for app in applications:
            # Récupérer les emails liés
            emails = db.query(Email).filter(Email.application_id == app.id).all()
            
            # Calculer des métriques
            email_count = len(emails)
            last_interaction = max(email.received_date for email in emails) if emails else app.created_at
            
            # Extraire le dernier statut détecté
            latest_status_email = None
            if emails:
                latest_status_email = max(emails, key=lambda x: x.received_date)
            
            excel_row = {
                "ID": app.id,
                "Entreprise": app.company_name,
                "Poste": app.job_title,
                "Statut": app.status,
                "Date candidature": app.created_at.strftime("%d/%m/%Y"),
                "Dernière interaction": last_interaction.strftime("%d/%m/%Y"),
                "Nombre d'emails": email_count,
                "Contact": app.contact_person or "Non renseigné",
                "Localisation": app.location or "Non renseignée",
                "Source": app.source,
                "Urgence": getattr(app, 'urgency_level', 'NORMAL'),
                "Date entretien": app.interview_date.strftime("%d/%m/%Y") if app.interview_date else None,
                "Dernière classification": latest_status_email.classification if latest_status_email else None,
                "Dernier expéditeur": latest_status_email.sender if latest_status_email else None,
                "Notes automatiques": app.notes[:100] + "..." if app.notes and len(app.notes) > 100 else app.notes,
                "Création automatique": "Oui" if app.source and "Détecté automatiquement" in app.source else "Non"
            }
            
            excel_data.append(excel_row)
        
        return {
            "success": True,
            "data": {
                "total_records": len(excel_data),
                "records": excel_data,
                "columns": list(excel_data[0].keys()) if excel_data else [],
                "export_date": datetime.utcnow().isoformat(),
                "filters_applied": {
                    "company": company_filter,
                    "status": status_filter
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la simulation d'export Excel: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la simulation d'export: {str(e)}"
        )
