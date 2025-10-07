from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.models import Email, Application
from app.models.schemas import (
    ApplicationCreate, ApplicationStatus, EmailClassification
)
from app.services.application_service import ApplicationService
import re
import logging

logger = logging.getLogger(__name__)


class EmailToApplicationService:
    """
    Service pour créer automatiquement des candidatures à partir des emails classifiés
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.application_service = ApplicationService(db)

    def process_classified_emails(self) -> dict:
        """
        Traite tous les emails classifiés qui n'ont pas encore de candidature associée
        """
        # Récupérer les emails classifiés qui n'ont pas d'application_id
        emails_to_process = self.db.query(Email).filter(
            Email.application_id.is_(None),
            Email.classification.in_([
                EmailClassification.INTERVIEW.value,
                EmailClassification.OFFER.value,
                EmailClassification.REQUEST.value,
                EmailClassification.REJECTED.value
            ])
        ).all()
        
        results = {
            "processed": 0,
            "created_applications": 0,
            "linked_applications": 0,
            "errors": []
        }
        
        for email in emails_to_process:
            try:
                application = self._create_or_link_application(email)
                if application:
                    email.application_id = application.id
                    self.db.commit()
                    results["processed"] += 1
                    if hasattr(application, '_newly_created'):
                        results["created_applications"] += 1
                    else:
                        results["linked_applications"] += 1
                        
            except Exception as e:
                logger.error(f"Erreur lors du traitement de l'email {email.id}: {str(e)}")
                results["errors"].append(f"Email {email.id}: {str(e)}")
                
        return results

    def _create_or_link_application(self, email: Email) -> Optional[Application]:
        """
        Crée une nouvelle candidature ou lie à une existante basé sur l'email
        """
        # Extraire les informations de l'email
        company_name = self._extract_company_name(email)
        job_title = self._extract_job_title(email)
        
        # Chercher une candidature existante pour la même entreprise
        existing_application = self.db.query(Application).filter(
            Application.company_name.ilike(f"%{company_name}%")
        ).first()
        
        if existing_application:
            # Lier à la candidature existante
            return existing_application
        
        # Créer une nouvelle candidature
        status = self._determine_status_from_classification(email.classification)
        
        application_data = ApplicationCreate(
            job_title=job_title or "Poste non spécifié",
            company_name=company_name,
            source=f"Email de {email.sender}",
            location=None,
            status=status,
            notes=f"Créé automatiquement à partir de l'email: {email.subject}\n\nContenu: {email.snippet[:200]}..."
        )
        
        application = self.application_service.create_application(application_data)
        application._newly_created = True  # Marquer comme nouvellement créé
        
        return application

    def _extract_company_name(self, email: Email) -> str:
        """
        Extrait le nom de l'entreprise à partir de l'email
        """
        sender_domain = email.sender.split('@')[-1] if '@' in email.sender else email.sender
        
        # Nettoyer le domaine
        company_name = sender_domain.replace('.com', '').replace('.fr', '').replace('.net', '')
        company_name = company_name.split('.')[0]  # Prendre seulement la première partie
        
        # Capitaliser
        company_name = company_name.capitalize()
        
        # Cas spéciaux pour des domaines connus
        domain_mapping = {
            'linkedin': 'LinkedIn',
            'gmail': 'Contact Gmail',
            'noreply': 'Contact Direct',
            'hr': 'Ressources Humaines',
            'jobs': 'Plateforme Emploi',
            'recrutement': 'Service Recrutement'
        }
        
        for key, value in domain_mapping.items():
            if key in sender_domain.lower():
                return value
                
        return company_name

    def _extract_job_title(self, email: Email) -> Optional[str]:
        """
        Extrait le titre du poste à partir du sujet de l'email
        """
        subject = email.subject.lower()
        
        # Patterns courants pour les titres de poste
        job_patterns = [
            r'poste\s+(?:de\s+)?([^-,\n]+)',
            r'(?:développeur|developer)\s+([^-,\n]+)',
            r'(?:ingénieur|engineer)\s+([^-,\n]+)',
            r'(?:lead|senior|junior)\s+([^-,\n]+)',
            r'candidature[^-]*-\s*([^-,\n]+)',
            r'offre\s+(?:d\'emploi\s+)?[^-]*-\s*([^-,\n]+)',
            r'entretien[^-]*-\s*([^-,\n]+)'
        ]
        
        for pattern in job_patterns:
            match = re.search(pattern, subject)
            if match:
                job_title = match.group(1).strip()
                # Nettoyer et capitaliser
                job_title = ' '.join(word.capitalize() for word in job_title.split())
                return job_title
                
        return None

    def _determine_status_from_classification(self, classification: str) -> ApplicationStatus:
        """
        Détermine le statut de la candidature basé sur la classification de l'email
        """
        status_mapping = {
            EmailClassification.INTERVIEW.value: ApplicationStatus.INTERVIEW,
            EmailClassification.OFFER.value: ApplicationStatus.OFFER,
            EmailClassification.REQUEST.value: ApplicationStatus.APPLIED,
            EmailClassification.REJECTED.value: ApplicationStatus.REJECTED,
            EmailClassification.ACK.value: ApplicationStatus.ACKNOWLEDGED
        }
        
        return status_mapping.get(classification, ApplicationStatus.APPLIED)

    def get_unprocessed_emails_count(self) -> int:
        """
        Retourne le nombre d'emails classifiés qui n'ont pas encore de candidature associée
        """
        return self.db.query(Email).filter(
            Email.application_id.is_(None),
            Email.classification.in_([
                EmailClassification.INTERVIEW.value,
                EmailClassification.OFFER.value,
                EmailClassification.REQUEST.value,
                EmailClassification.REJECTED.value
            ])
        ).count()
