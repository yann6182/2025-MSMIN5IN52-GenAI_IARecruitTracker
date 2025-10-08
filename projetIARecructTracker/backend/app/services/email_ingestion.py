import imaplib
import email
import email.header
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.models import Email
from app.core.config import settings
from loguru import logger
import uuid
import re


class EmailIngestionService:
    """
    [DEPRECATED] Service pour récupérer les emails depuis IMAP
    
    ⚠️ Ce service est obsolète. Utilisez plutôt GmailAPIService avec Gmail OAuth 2.0
    qui est plus sécurisé et ne nécessite pas de mot de passe d'application.
    
    Voir: app/services/gmail_api_service.py
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.imap_host = settings.IMAP_HOST
        self.imap_user = settings.IMAP_USER
        self.imap_password = settings.IMAP_PASSWORD
        
    def connect_imap(self) -> Optional[imaplib.IMAP4_SSL]:
        """Se connecter au serveur IMAP"""
        try:
            mail = imaplib.IMAP4_SSL(self.imap_host)
            mail.login(self.imap_user, self.imap_password)
            logger.info(f"Connected to IMAP server {self.imap_host}")
            return mail
        except Exception as e:
            logger.error(f"Failed to connect to IMAP: {e}")
            return None
    
    def decode_header(self, header: str) -> str:
        """Décoder les en-têtes d'email encodés"""
        try:
            decoded = email.header.decode_header(header)
            decoded_string = ""
            for part, encoding in decoded:
                if isinstance(part, bytes):
                    decoded_string += part.decode(encoding or 'utf-8', errors='ignore')
                else:
                    decoded_string += part
            return decoded_string.strip()
        except Exception as e:
            logger.warning(f"Failed to decode header: {e}")
            return header or ""
    
    def extract_email_content(self, msg: email.message.Message) -> Dict[str, Any]:
        """Extraire le contenu d'un email"""
        content = {
            'subject': '',
            'sender': '',
            'recipients': [],
            'cc': [],
            'bcc': [],
            'body': '',
            'snippet': '',
            'html_body': ''
        }
        
        # En-têtes principaux
        if msg['Subject']:
            content['subject'] = self.decode_header(msg['Subject'])
        
        if msg['From']:
            content['sender'] = self.decode_header(msg['From'])
            # Extraire juste l'email
            email_match = re.search(r'<([^>]+)>', content['sender'])
            if email_match:
                content['sender'] = email_match.group(1)
            elif '@' in content['sender']:
                content['sender'] = content['sender'].split()[0] if ' ' in content['sender'] else content['sender']
        
        # Destinataires
        if msg['To']:
            to_header = self.decode_header(msg['To'])
            content['recipients'] = [addr.strip() for addr in to_header.split(',')]
        
        if msg['Cc']:
            cc_header = self.decode_header(msg['Cc'])
            content['cc'] = [addr.strip() for addr in cc_header.split(',')]
        
        if msg['Bcc']:
            bcc_header = self.decode_header(msg['Bcc'])
            content['bcc'] = [addr.strip() for addr in bcc_header.split(',')]
        
        # Corps du message
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get('Content-Disposition', ''))
                
                # Éviter les pièces jointes
                if 'attachment' in content_disposition:
                    continue
                
                if content_type == 'text/plain':
                    try:
                        body = part.get_payload(decode=True)
                        if body:
                            content['body'] = body.decode('utf-8', errors='ignore')
                    except Exception as e:
                        logger.warning(f"Failed to decode text part: {e}")
                
                elif content_type == 'text/html':
                    try:
                        html_body = part.get_payload(decode=True)
                        if html_body:
                            content['html_body'] = html_body.decode('utf-8', errors='ignore')
                    except Exception as e:
                        logger.warning(f"Failed to decode HTML part: {e}")
        else:
            # Message simple (non-multipart)
            try:
                body = msg.get_payload(decode=True)
                if body:
                    content['body'] = body.decode('utf-8', errors='ignore')
            except Exception as e:
                logger.warning(f"Failed to decode simple message: {e}")
        
        # Créer un snippet (résumé)
        if content['body']:
            # Nettoyer le texte et créer un résumé
            clean_body = re.sub(r'\s+', ' ', content['body']).strip()
            content['snippet'] = clean_body[:200] + ('...' if len(clean_body) > 200 else '')
        
        return content
    
    def is_recruitment_email(self, subject: str, body: str, sender: str) -> bool:
        """Déterminer si un email est lié au recrutement"""
        recruitment_keywords = [
            # Français
            'candidature', 'recrutement', 'emploi', 'poste', 'entretien', 
            'cv', 'offre', 'rh', 'ressources humaines', 'stage', 'job',
            'carrière', 'opportunité', 'position', 'mission', 'rejoindre',
            # Anglais
            'application', 'recruitment', 'job', 'position', 'interview',
            'resume', 'offer', 'hr', 'human resources', 'internship',
            'career', 'opportunity', 'hiring', 'join', 'team'
        ]
        
        text_to_check = f"{subject} {body} {sender}".lower()
        
        for keyword in recruitment_keywords:
            if keyword in text_to_check:
                return True
        
        return False
    
    def fetch_recent_emails(self, days_back: int = 30, folder: str = 'INBOX') -> List[Dict[str, Any]]:
        """Récupérer les emails récents depuis IMAP"""
        mail = self.connect_imap()
        if not mail:
            return []
        
        try:
            # Sélectionner le dossier
            mail.select(folder)
            
            # Calculer la date de début
            since_date = (datetime.now() - timedelta(days=days_back)).strftime('%d-%b-%Y')
            
            # Rechercher les emails depuis cette date
            search_criteria = f'SINCE {since_date}'
            typ, msgnums = mail.search(None, search_criteria)
            
            if typ != 'OK':
                logger.error("Failed to search emails")
                return []
            
            email_list = []
            msgnums = msgnums[0].split()
            
            logger.info(f"Found {len(msgnums)} emails in the last {days_back} days")
            
            # Traiter les emails (limiter à 100 pour éviter la surcharge)
            for num in msgnums[-100:]:  # Prendre les 100 plus récents
                try:
                    typ, msg_data = mail.fetch(num, '(RFC822)')
                    if typ != 'OK':
                        continue
                    
                    email_message = email.message_from_bytes(msg_data[0][1])
                    
                    # Extraire le contenu
                    content = self.extract_email_content(email_message)
                    
                    # Ajouter des métadonnées
                    content['message_id'] = email_message.get('Message-ID', f'imap-{num.decode()}')
                    content['date'] = email_message.get('Date', '')
                    
                    # Parser la date
                    try:
                        if content['date']:
                            parsed_date = email.utils.parsedate_to_datetime(content['date'])
                            content['sent_at'] = parsed_date
                        else:
                            content['sent_at'] = datetime.now(timezone.utc)
                    except Exception as e:
                        logger.warning(f"Failed to parse date: {e}")
                        content['sent_at'] = datetime.now(timezone.utc)
                    
                    # Vérifier si c'est un email de recrutement
                    if self.is_recruitment_email(
                        content['subject'], 
                        content['body'], 
                        content['sender']
                    ):
                        email_list.append(content)
                        logger.info(f"Found recruitment email: {content['subject']}")
                    
                except Exception as e:
                    logger.warning(f"Failed to process email {num}: {e}")
                    continue
            
            logger.info(f"Extracted {len(email_list)} recruitment emails")
            return email_list
            
        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            return []
        finally:
            try:
                mail.close()
                mail.logout()
            except:
                pass
    
    def save_emails_to_db(self, emails: List[Dict[str, Any]]) -> int:
        """Sauvegarder les emails en base de données"""
        saved_count = 0
        
        for email_data in emails:
            try:
                # Vérifier si l'email existe déjà
                existing = self.db.query(Email).filter(
                    Email.external_id == email_data['message_id']
                ).first()
                
                if existing:
                    logger.debug(f"Email already exists: {email_data['subject']}")
                    continue
                
                # Créer un nouvel email
                new_email = Email(
                    id=uuid.uuid4(),
                    external_id=email_data['message_id'],
                    subject=email_data['subject'],
                    sender=email_data['sender'],
                    recipients=email_data['recipients'] or [],
                    cc=email_data['cc'] or [],
                    bcc=email_data['bcc'] or [],
                    sent_at=email_data['sent_at'],
                    raw_body=email_data['body'],
                    snippet=email_data['snippet'],
                    created_at=datetime.now(timezone.utc)
                )
                
                self.db.add(new_email)
                saved_count += 1
                logger.info(f"Saved email: {email_data['subject']}")
                
            except Exception as e:
                logger.error(f"Failed to save email: {e}")
                continue
        
        try:
            self.db.commit()
            logger.info(f"Successfully saved {saved_count} emails to database")
        except Exception as e:
            logger.error(f"Failed to commit emails: {e}")
            self.db.rollback()
            saved_count = 0
        
        return saved_count
    
    def ingest_emails(self, days_back: int = 30) -> Dict[str, Any]:
        """Ingérer les emails depuis IMAP"""
        logger.info(f"Starting email ingestion for last {days_back} days")
        
        # Récupérer les emails
        emails = self.fetch_recent_emails(days_back)
        
        if not emails:
            return {
                "success": True,
                "message": "No new recruitment emails found",
                "emails_found": 0,
                "emails_saved": 0
            }
        
        # Sauvegarder en base
        saved_count = self.save_emails_to_db(emails)
        
        return {
            "success": True,
            "message": f"Email ingestion completed",
            "emails_found": len(emails),
            "emails_saved": saved_count
        }
