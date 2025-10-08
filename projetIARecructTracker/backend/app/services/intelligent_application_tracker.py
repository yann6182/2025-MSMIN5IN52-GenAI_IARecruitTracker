from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.models.models import Email, Application
from app.models.schemas import (
    ApplicationCreate, ApplicationUpdate, ApplicationStatus, EmailClassification,
    UrgencyLevel, Priority
)
from app.services.application_service import ApplicationService
import re
import logging
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class IntelligentApplicationTracker:
    """
    Service intelligent pour gérer automatiquement les candidatures basé sur l'analyse des emails.
    Fonctionne comme un Excel intelligent qui:
    - Détecte automatiquement les nouvelles candidatures
    - Met à jour les statuts existants
    - Extrait les informations pertinentes
    - Maintient un suivi automatisé
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.application_service = ApplicationService(db)

    def process_email_batch(self, user_id: int, limit: int = 50) -> Dict[str, Any]:
        """
        Traite un lot d'emails pour détecter et mettre à jour les candidatures de l'utilisateur spécifié
        """
        # Récupérer les emails non traités de l'utilisateur
        emails = self.db.query(Email).filter(
            Email.user_id == user_id,
            Email.application_id.is_(None),
            Email.classification.isnot(None)
        ).order_by(Email.sent_at.desc()).limit(limit).all()
        
        results = {
            "processed_emails": 0,
            "created_applications": 0,
            "updated_applications": 0,
            "linked_emails": 0,
            "details": [],
            "errors": []
        }
        
        for email in emails:
            try:
                action_result = self._process_single_email(email)
                results["processed_emails"] += 1
                
                if action_result["action"] == "created":
                    results["created_applications"] += 1
                elif action_result["action"] == "updated":
                    results["updated_applications"] += 1
                elif action_result["action"] == "linked":
                    results["linked_emails"] += 1
                    
                results["details"].append(action_result)
                
            except Exception as e:
                logger.error(f"Erreur lors du traitement de l'email {email.id}: {str(e)}")
                results["errors"].append({
                    "email_id": email.id,
                    "subject": email.subject,
                    "error": str(e)
                })
                
        return results

    def _process_single_email(self, email: Email) -> Dict[str, Any]:
        """
        Traite un email individuel et détermine l'action à prendre
        """
        # Extraire les informations clés de l'email
        extracted_info = self._extract_email_information(email)
        
        # Chercher une candidature existante correspondante
        matching_application = self._find_matching_application(extracted_info, email.user_id)
        
        if matching_application:
            # Mettre à jour la candidature existante si nécessaire
            updated = self._update_existing_application(matching_application, email, extracted_info)
            email.application_id = matching_application.id
            self.db.commit()
            
            return {
                "action": "updated" if updated else "linked",
                "application_id": matching_application.id,
                "email_id": email.id,
                "company": extracted_info.get("company_name"),
                "job_title": extracted_info.get("job_title"),
                "status_change": extracted_info.get("detected_status"),
                "details": extracted_info
            }
        else:
            # Créer une nouvelle candidature
            new_application = self._create_new_application(email, extracted_info)
            email.application_id = new_application.id
            self.db.commit()
            
            return {
                "action": "created",
                "application_id": new_application.id,
                "email_id": email.id,
                "company": extracted_info.get("company_name"),
                "job_title": extracted_info.get("job_title"),
                "status": extracted_info.get("detected_status"),
                "details": extracted_info
            }

    def _extract_email_information(self, email: Email) -> Dict[str, Any]:
        """
        Extrait toutes les informations pertinentes d'un email pour les candidatures
        """
        content = f"{email.subject} {email.raw_body or email.snippet or ''}"
        
        info = {
            "email_type": email.classification,
            "sender_domain": self._extract_domain(email.sender),
            "company_name": self._extract_company_name(email),
            "job_title": self._extract_job_title(email),
            "detected_status": self._detect_application_status(email),
            "salary_info": self._extract_salary_info(content),
            "interview_date": self._extract_interview_date(content),
            "contact_person": self._extract_contact_person(email),
            "urgency_level": self._assess_urgency(email),
            "response_deadline": self._extract_deadline(content),
            "job_reference": self._extract_job_reference(content),
            "location": self._extract_location(content),
            "keywords": self._extract_keywords(content)
        }
        
        return info

    def _extract_company_name(self, email: Email) -> str:
        """
        Extrait le nom de l'entreprise avec plusieurs stratégies
        """
        # 1. Depuis le domaine email
        domain = self._extract_domain(email.sender)
        if domain and domain not in ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']:
            # Nettoyer le domaine pour obtenir le nom de l'entreprise
            company_from_domain = domain.replace('.com', '').replace('.fr', '').replace('.org', '')
            company_from_domain = company_from_domain.split('.')[0].title()
            
        # 2. Depuis le contenu de l'email
        content = f"{email.subject} {email.raw_body or email.snippet or ''}"
        
        # Patterns courants pour détecter les noms d'entreprise
        company_patterns = [
            r"équipe (\w+)",
            r"société (\w+)",
            r"entreprise (\w+)",
            r"groupe (\w+)",
            r"(\w+) recrute",
            r"rejoindre (\w+)",
            r"poste chez (\w+)",
            r"candidature (\w+)",
        ]
        
        for pattern in company_patterns:
            match = re.search(pattern, content.lower())
            if match:
                return match.group(1).title()
                
        # 3. Si pas trouvé, utiliser le domaine nettoyé
        if 'company_from_domain' in locals():
            return company_from_domain
            
        # 4. Fallback sur l'expéditeur
        sender_name = email.sender.split('@')[0] if '@' in email.sender else email.sender
        return sender_name.title()

    def _extract_job_title(self, email: Email) -> Optional[str]:
        """
        Extrait le titre du poste depuis l'email
        """
        content = f"{email.subject} {email.raw_body or email.snippet or ''}"
        
        # Patterns pour détecter les titres de poste
        job_patterns = [
            r"poste de ([^,\.\n]+)",
            r"poste ([^,\.\n]+)",
            r"développeur ([^,\.\n]+)",
            r"ingénieur ([^,\.\n]+)",
            r"chef de projet ([^,\.\n]+)",
            r"manager ([^,\.\n]+)",
            r"analyste ([^,\.\n]+)",
            r"consultant ([^,\.\n]+)",
            r"pour le poste ([^,\.\n]+)",
            r"offre d'emploi ([^,\.\n]+)",
            r"candidature ([^,\.\n]+)",
        ]
        
        for pattern in job_patterns:
            match = re.search(pattern, content.lower())
            if match:
                job_title = match.group(1).strip()
                # Nettoyer le titre
                job_title = re.sub(r'[^\w\s-]', '', job_title)
                return job_title.title()
                
        # Si rien trouvé dans le contenu, utiliser des mots-clés du sujet
        subject_lower = email.subject.lower()
        if any(keyword in subject_lower for keyword in ['développeur', 'developer', 'ingénieur', 'engineer']):
            return "Développeur"
        elif any(keyword in subject_lower for keyword in ['manager', 'chef', 'lead']):
            return "Manager"
        elif any(keyword in subject_lower for keyword in ['analyste', 'analyst']):
            return "Analyste"
            
        return "Poste non spécifié"

    def _detect_application_status(self, email: Email) -> ApplicationStatus:
        """
        Détecte le statut de candidature basé sur le type d'email et le contenu
        """
        content = f"{email.subject} {email.raw_body or email.snippet or ''}".lower()
        
        # Mapping des classifications email vers les statuts d'application
        if email.classification == EmailClassification.ACK.value:
            return ApplicationStatus.ACKNOWLEDGED
        elif email.classification == EmailClassification.REJECTED.value:
            return ApplicationStatus.REJECTED
        elif email.classification == EmailClassification.INTERVIEW.value:
            return ApplicationStatus.INTERVIEW
        elif email.classification == EmailClassification.OFFER.value:
            return ApplicationStatus.OFFER
        elif email.classification == EmailClassification.REQUEST.value:
            # Pour les demandes, déterminer s'il s'agit d'une candidature sortante
            if any(keyword in content for keyword in ['votre candidature', 'votre cv', 'candidature envoyée']):
                return ApplicationStatus.APPLIED
            else:
                return ApplicationStatus.SCREENING
        else:
            # Détection basée sur les mots-clés du contenu
            if any(keyword in content for keyword in ['rejeté', 'refusé', 'pas retenu', 'n\'avons pas']):
                return ApplicationStatus.REJECTED
            elif any(keyword in content for keyword in ['entretien', 'interview', 'rencontre', 'rendez-vous']):
                return ApplicationStatus.INTERVIEW
            elif any(keyword in content for keyword in ['offre', 'proposition', 'contrat']):
                return ApplicationStatus.OFFER
            elif any(keyword in content for keyword in ['reçu', 'accusé', 'bien reçue']):
                return ApplicationStatus.ACKNOWLEDGED
            else:
                return ApplicationStatus.APPLIED

    def _extract_salary_info(self, content: str) -> Optional[str]:
        """
        Extrait les informations de salaire du contenu
        """
        salary_patterns = [
            r'(\d+\.?\d*k?)\s*€?\s*(?:par an|annuel|k€)',
            r'salaire.*?(\d+\.?\d*k?)\s*€',
            r'rémunération.*?(\d+\.?\d*k?)\s*€',
            r'(\d+)\s*à\s*(\d+)\s*k€',
        ]
        
        for pattern in salary_patterns:
            match = re.search(pattern, content.lower())
            if match:
                return match.group(0)
        return None

    def _extract_interview_date(self, content: str) -> Optional[datetime]:
        """
        Extrait la date d'entretien du contenu
        """
        # Patterns pour détecter les dates
        date_patterns = [
            r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})',
            r'(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})',
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, content.lower())
            if match:
                try:
                    if len(match.groups()) == 3:
                        if match.group(2).isdigit():
                            # Format DD/MM/YYYY
                            day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
                            return datetime(year, month, day)
                        else:
                            # Format avec nom de mois
                            months = {
                                'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4,
                                'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8,
                                'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
                            }
                            day, month_name, year = int(match.group(1)), match.group(2), int(match.group(3))
                            month = months.get(month_name, 1)
                            return datetime(year, month, day)
                except ValueError:
                    continue
        return None

    def _extract_contact_person(self, email: Email) -> Optional[str]:
        """
        Extrait le nom de la personne de contact
        """
        sender = email.sender
        if '@' in sender:
            name_part = sender.split('@')[0]
            # Nettoyer et formater le nom
            name_parts = re.split(r'[.\-_]', name_part)
            if len(name_parts) >= 2:
                return ' '.join(part.title() for part in name_parts[:2])
        return None

    def _assess_urgency(self, email: Email) -> str:
        """
        Évalue le niveau d'urgence basé sur le contenu
        """
        content = f"{email.subject} {email.raw_body or email.snippet or ''}".lower()
        
        urgent_keywords = ['urgent', 'rapidement', 'dès que possible', 'immédiatement']
        high_keywords = ['bientôt', 'prochainement', 'dans les plus brefs délais']
        
        if any(keyword in content for keyword in urgent_keywords):
            return "URGENT"
        elif any(keyword in content for keyword in high_keywords):
            return "HIGH"
        else:
            return "NORMAL"

    def _extract_deadline(self, content: str) -> Optional[datetime]:
        """
        Extrait la date limite de réponse
        """
        deadline_patterns = [
            r'avant le (\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})',
            r'deadline.*?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})',
            r'réponse.*?(\d{1,2})\s+jours?',
        ]
        
        for pattern in deadline_patterns:
            match = re.search(pattern, content.lower())
            if match:
                try:
                    if 'jours' in pattern:
                        days = int(match.group(1))
                        return datetime.now() + timedelta(days=days)
                    else:
                        day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
                        return datetime(year, month, day)
                except ValueError:
                    continue
        return None

    def _extract_job_reference(self, content: str) -> Optional[str]:
        """
        Extrait la référence du poste
        """
        ref_patterns = [
            r'ref[erence]*[:\s]*([A-Za-z0-9\-_]+)',
            r'référence[:\s]*([A-Za-z0-9\-_]+)',
            r'job[:\s]*([A-Za-z0-9\-_]+)',
        ]
        
        for pattern in ref_patterns:
            match = re.search(pattern, content.lower())
            if match:
                return match.group(1).upper()
        return None

    def _extract_location(self, content: str) -> Optional[str]:
        """
        Extrait la localisation du poste
        """
        location_patterns = [
            r'localisation[:\s]*([^,\.\n]+)',
            r'lieu[:\s]*([^,\.\n]+)',
            r'basé[e]? à ([^,\.\n]+)',
            r'situé[e]? à ([^,\.\n]+)',
            r'télétravail',
            r'remote',
            r'paris|lyon|marseille|toulouse|nantes|strasbourg|bordeaux|lille',
        ]
        
        for pattern in location_patterns:
            match = re.search(pattern, content.lower())
            if match:
                if match.group(0) in ['télétravail', 'remote']:
                    return 'Télétravail'
                else:
                    return match.group(1).title() if hasattr(match, 'group') and len(match.groups()) > 0 else match.group(0).title()
        return None

    def _extract_keywords(self, content: str) -> List[str]:
        """
        Extrait les mots-clés techniques pertinents
        """
        tech_keywords = [
            'python', 'java', 'javascript', 'react', 'angular', 'vue', 'node.js',
            'machine learning', 'ia', 'intelligence artificielle', 'data science',
            'sql', 'postgresql', 'mongodb', 'aws', 'azure', 'docker', 'kubernetes',
            'agile', 'scrum', 'devops', 'ci/cd', 'git'
        ]
        
        found_keywords = []
        content_lower = content.lower()
        
        for keyword in tech_keywords:
            if keyword in content_lower:
                found_keywords.append(keyword)
                
        return found_keywords

    def _extract_domain(self, email_address: str) -> Optional[str]:
        """
        Extrait le domaine d'une adresse email
        """
        if '@' in email_address:
            return email_address.split('@')[1].lower()
        return None

    def _find_matching_application(self, extracted_info: Dict[str, Any], user_id: int) -> Optional[Application]:
        """
        Trouve une candidature correspondante basée sur les informations extraites pour un utilisateur spécifique
        """
        company_name = extracted_info.get("company_name")
        job_title = extracted_info.get("job_title")
        
        if not company_name:
            return None
            
        # Recherche par nom d'entreprise (similarité) pour l'utilisateur spécifique
        applications = self.db.query(Application).filter(
            Application.user_id == user_id,
            Application.company_name.isnot(None)
        ).all()
        
        best_match = None
        best_score = 0
        
        for app in applications:
            # Calculer la similarité entre les noms d'entreprise
            company_similarity = SequenceMatcher(None, 
                company_name.lower(), 
                app.company_name.lower()).ratio()
            
            # Si on a aussi un titre de poste, l'inclure dans le calcul
            if job_title and app.job_title:
                job_similarity = SequenceMatcher(None, 
                    job_title.lower(), 
                    app.job_title.lower()).ratio()
                total_score = (company_similarity * 0.7) + (job_similarity * 0.3)
            else:
                total_score = company_similarity
            
            if total_score > best_score and total_score > 0.6:  # Seuil de similarité
                best_score = total_score
                best_match = app
                
        return best_match

    def _update_existing_application(self, application: Application, email: Email, extracted_info: Dict[str, Any]) -> bool:
        """
        Met à jour une candidature existante avec les nouvelles informations
        """
        updated = False
        new_status = extracted_info.get("detected_status")
        
        # Mettre à jour le statut si il a évolué
        if new_status and new_status != application.status:
            # Vérifier que c'est une progression logique
            status_progression = {
                ApplicationStatus.APPLIED: [ApplicationStatus.ACKNOWLEDGED, ApplicationStatus.SCREENING, ApplicationStatus.REJECTED],
                ApplicationStatus.ACKNOWLEDGED: [ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
                ApplicationStatus.SCREENING: [ApplicationStatus.INTERVIEW, ApplicationStatus.TECHNICAL_TEST, ApplicationStatus.REJECTED],
                ApplicationStatus.INTERVIEW: [ApplicationStatus.TECHNICAL_TEST, ApplicationStatus.OFFER, ApplicationStatus.REJECTED],
                ApplicationStatus.TECHNICAL_TEST: [ApplicationStatus.OFFER, ApplicationStatus.REJECTED]
            }
            
            current_status = ApplicationStatus(application.status)
            if (current_status in status_progression and 
                new_status in status_progression[current_status]) or \
               new_status == ApplicationStatus.REJECTED:  # Les rejets peuvent arriver à tout moment
                
                application.status = new_status.value
                application.last_update_date = datetime.utcnow()
                updated = True
        
        # Mettre à jour d'autres champs si ils sont vides ou plus précis
        if extracted_info.get("contact_person") and not application.contact_person:
            application.contact_person = extracted_info["contact_person"]
            updated = True
            
        if extracted_info.get("location") and not application.location:
            application.location = extracted_info["location"]
            updated = True
            
        if extracted_info.get("interview_date"):
            application.interview_date = extracted_info["interview_date"]
            updated = True
            
        if extracted_info.get("salary_info"):
            # Ajouter l'info de salaire aux notes s'il n'y en a pas déjà
            salary_note = f"Salaire mentionné: {extracted_info['salary_info']}"
            if application.notes:
                if salary_note not in application.notes:
                    application.notes += f"\n{salary_note}"
                    updated = True
            else:
                application.notes = salary_note
                updated = True
        
        if updated:
            self.db.commit()
            
        return updated

    def _create_new_application(self, email: Email, extracted_info: Dict[str, Any]) -> Application:
        """
        Crée une nouvelle candidature basée sur les informations extraites
        """
        application_data = ApplicationCreate(
            job_title=extracted_info.get("job_title", "Poste non spécifié"),
            company_name=extracted_info.get("company_name", "Entreprise inconnue"),
            location=extracted_info.get("location"),
            status=extracted_info.get("detected_status", ApplicationStatus.APPLIED),
            source=f"Détecté automatiquement - Email de {email.sender}",
            contact_person=extracted_info.get("contact_person"),
            notes=self._generate_application_notes(email, extracted_info),
            job_reference=extracted_info.get("job_reference"),
            urgency_level=extracted_info.get("urgency_level", "NORMAL"),
            interview_date=extracted_info.get("interview_date"),
            response_deadline=extracted_info.get("response_deadline")
        )
        
        return self.application_service.create_application(application_data, user_id=email.user_id)

    def _generate_application_notes(self, email: Email, extracted_info: Dict[str, Any]) -> str:
        """
        Génère des notes automatiques pour la candidature
        """
        notes = f"📧 Créé automatiquement à partir de l'email: {email.subject}\n"
        notes += f"📅 Email reçu le: {email.sent_at}\n"
        notes += f"👤 Expéditeur: {email.sender}\n\n"
        
        if extracted_info.get("keywords"):
            notes += f"🔍 Mots-clés détectés: {', '.join(extracted_info['keywords'])}\n"
        
        if extracted_info.get("salary_info"):
            notes += f"💰 Salaire mentionné: {extracted_info['salary_info']}\n"
        
        if extracted_info.get("urgency_level") != "NORMAL":
            notes += f"⚡ Niveau d'urgence: {extracted_info['urgency_level']}\n"
        
        # Ajouter un extrait du contenu de l'email
        snippet = email.snippet or email.raw_body
        if snippet:
            notes += f"\n📝 Extrait de l'email:\n{snippet[:300]}..."
        
        return notes

    def get_processing_summary(self, user_id: int) -> Dict[str, Any]:
        """
        Retourne un résumé du traitement des candidatures pour un utilisateur spécifique
        """
        total_applications = self.db.query(Application).filter(Application.user_id == user_id).count()
        total_emails = self.db.query(Email).filter(Email.user_id == user_id).count()
        linked_emails = self.db.query(Email).filter(
            Email.user_id == user_id,
            Email.application_id.isnot(None)
        ).count()
        
        # Applications par statut pour l'utilisateur
        status_breakdown = {}
        for status in ApplicationStatus:
            count = self.db.query(Application).filter(
                Application.user_id == user_id,
                Application.status == status.value
            ).count()
            status_breakdown[status.value] = count
        
        # Applications créées automatiquement vs manuellement pour l'utilisateur
        auto_created = self.db.query(Application).filter(
            Application.user_id == user_id,
            Application.source.like('%Détecté automatiquement%')
        ).count()
        
        return {
            "total_applications": total_applications,
            "auto_created_applications": auto_created,
            "manual_applications": total_applications - auto_created,
            "total_emails": total_emails,
            "linked_emails": linked_emails,
            "unprocessed_emails": total_emails - linked_emails,
            "status_breakdown": status_breakdown,
            "automation_rate": (auto_created / total_applications * 100) if total_applications > 0 else 0
        }
