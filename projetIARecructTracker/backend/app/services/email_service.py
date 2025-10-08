from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.models.models import Email, ApplicationEvent
from app.models.schemas import EmailCreate
from app.nlp.extraction_service import EmailExtractionService
from app.nlp.classification_service import EmailClassificationService
from app.nlp.matching_service import EmailMatchingService
from fastapi import UploadFile
from loguru import logger
import email
from email.parser import Parser
from datetime import datetime


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        self.extraction_service = EmailExtractionService()
        self.classification_service = EmailClassificationService()
        self.matching_service = EmailMatchingService(db)

    def get_emails(self, user_id: UUID, skip: int = 0, limit: int = 50, unlinked_only: bool = False) -> List[Email]:
        """
        Récupérer les emails de l'utilisateur avec option de filtrage
        """
        query = self.db.query(Email).filter(Email.user_id == user_id)
        
        if unlinked_only:
            query = query.filter(Email.application_id.is_(None))
        
        return query.order_by(Email.created_at.desc()).offset(skip).limit(limit).all()

    def get_email(self, email_id: UUID, user_id: UUID) -> Email:
        """
        Récupérer un email spécifique appartenant à l'utilisateur
        """
        return self.db.query(Email).filter(
            Email.id == email_id,
            Email.user_id == user_id
        ).first()

    async def create_email(self, email_data: EmailCreate) -> Email:
        """
        Créer un nouvel email avec traitement NLP automatique
        """
        db_email = Email(**email_data.model_dump())
        self.db.add(db_email)
        self.db.commit()
        self.db.refresh(db_email)
        
        # Traitement NLP automatique
        await self._process_email_nlp(db_email)
        
        return db_email
    
    async def _process_email_nlp(self, email: Email):
        """
        Traiter un email avec les services NLP
        """
        try:
            subject = email.subject or ""
            body = email.snippet or email.raw_body or ""
            sender = email.sender or ""
            
            # 1. Extraction d'entités
            logger.info(f"Processing email {email.id} with NLP services")
            extracted = await self.extraction_service.extract_entities(subject, body, sender)
            
            # 2. Classification
            classification, suggested_status = await self.classification_service.classify_and_suggest_status(
                subject, body
            )
            
            # Mettre à jour l'email avec la classification
            email.classification = classification.email_type.value
            
            # 3. Matching automatique avec candidatures existantes
            matched_app_id = await self.matching_service.auto_link_email(email)
            
            if matched_app_id and suggested_status:
                # Mettre à jour le statut de la candidature si nécessaire
                await self._update_application_status(matched_app_id, suggested_status, email.id)
            
            # 4. Créer un événement pour traçabilité
            self._create_email_event(email, classification, extracted)
            
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error processing email {email.id} with NLP: {e}")
    
    async def _update_application_status(self, app_id: str, new_status: str, email_id: UUID):
        """
        Mettre à jour le statut d'une candidature basé sur un email
        """
        from app.models.models import Application
        
        application = self.db.query(Application).filter(Application.id == app_id).first()
        if application and application.status != new_status:
            old_status = application.status
            application.status = new_status
            application.updated_at = datetime.utcnow()
            
            # Créer un événement de changement de statut
            event = ApplicationEvent(
                application_id=app_id,
                event_type="STATUS_CHANGE",
                payload={
                    "previous_status": old_status,
                    "new_status": new_status,
                    "triggered_by_email": str(email_id),
                    "auto_classified": True
                }
            )
            self.db.add(event)
            
            logger.info(f"Updated application {app_id} status from {old_status} to {new_status}")
    
    def _create_email_event(self, email: Email, classification, extracted):
        """
        Créer un événement pour l'email traité
        """
        if email.application_id:
            event = ApplicationEvent(
                application_id=email.application_id,
                event_type="EMAIL_RECEIVED",
                payload={
                    "email_id": str(email.id),
                    "email_type": classification.email_type.value,
                    "classification_confidence": classification.confidence,
                    "extraction_confidence": extracted.confidence,
                    "subject": email.subject,
                    "sender": email.sender,
                    "keywords_matched": classification.keywords_matched
                }
            )
            self.db.add(event)

    def link_email_to_application(self, email_id: UUID, application_id: UUID, user_id: UUID) -> bool:
        """
        Lier un email à une candidature (en vérifiant que les deux appartiennent à l'utilisateur)
        """
        from app.models.models import Application
        
        db_email = self.db.query(Email).filter(
            Email.id == email_id,
            Email.user_id == user_id
        ).first()
        
        if not db_email:
            return False
        
        # Vérifier que l'application appartient aussi à l'utilisateur
        application = self.db.query(Application).filter(
            Application.id == application_id,
            Application.user_id == user_id
        ).first()
        
        if not application:
            return False
        
        db_email.application_id = application_id
        self.db.commit()
        return True

    async def import_email_files(self, files: List[UploadFile], user_id: UUID) -> List[dict]:
        """
        Importer des emails depuis des fichiers .eml pour un utilisateur spécifique
        """
        results = []
        parser = Parser()
        
        for file in files:
            try:
                content = file.file.read().decode('utf-8')
                msg = parser.parsestr(content)
                
                # Extraire les informations de l'email
                email_data = EmailCreate(
                    user_id=user_id,  # Associer à l'utilisateur
                    external_id=msg.get('Message-ID'),
                    subject=msg.get('Subject'),
                    sender=msg.get('From'),
                    recipients=[msg.get('To')] if msg.get('To') else [],
                    cc=[msg.get('Cc')] if msg.get('Cc') else [],
                    raw_headers=str(msg.items()),
                    raw_body=self._extract_body(msg),
                    snippet=self._extract_snippet(msg)
                )
                
                # Vérifier si l'email n'existe pas déjà pour cet utilisateur
                existing = self.db.query(Email).filter(
                    Email.external_id == email_data.external_id,
                    Email.user_id == user_id
                ).first()
                
                if not existing:
                    created_email = await self.create_email(email_data)
                    results.append({
                        "filename": file.filename,
                        "status": "imported",
                        "email_id": str(created_email.id)
                    })
                else:
                    results.append({
                        "filename": file.filename,
                        "status": "already_exists",
                        "email_id": str(existing.id)
                    })
                    
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "error": str(e)
                })
        
        return results

    def _extract_body(self, msg) -> str:
        """
        Extraire le corps de l'email
        """
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    return part.get_payload(decode=True).decode('utf-8', errors='ignore')
        else:
            return msg.get_payload(decode=True).decode('utf-8', errors='ignore')
        return ""

    def _extract_snippet(self, msg) -> str:
        """
        Extraire un extrait de l'email (première ligne ou 200 premiers caractères)
        """
        body = self._extract_body(msg)
        if body:
            # Prendre les 200 premiers caractères ou la première ligne
            snippet = body.strip()[:200]
            if len(body) > 200:
                snippet += "..."
            return snippet
        return ""
