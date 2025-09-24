from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.models.models import Email
from app.models.schemas import EmailCreate
from fastapi import UploadFile
import email
from email.parser import Parser


class EmailService:
    def __init__(self, db: Session):
        self.db = db

    def get_emails(self, skip: int = 0, limit: int = 50, unlinked_only: bool = False) -> List[Email]:
        """
        Récupérer les emails avec option de filtrage
        """
        query = self.db.query(Email)
        
        if unlinked_only:
            query = query.filter(Email.application_id.is_(None))
        
        return query.order_by(Email.created_at.desc()).offset(skip).limit(limit).all()

    def get_email(self, email_id: UUID) -> Email:
        """
        Récupérer un email spécifique
        """
        return self.db.query(Email).filter(Email.id == email_id).first()

    def create_email(self, email_data: EmailCreate) -> Email:
        """
        Créer un nouvel email
        """
        db_email = Email(**email_data.model_dump())
        self.db.add(db_email)
        self.db.commit()
        self.db.refresh(db_email)
        return db_email

    def link_email_to_application(self, email_id: UUID, application_id: UUID) -> bool:
        """
        Lier un email à une candidature
        """
        db_email = self.db.query(Email).filter(Email.id == email_id).first()
        if not db_email:
            return False
        
        db_email.application_id = application_id
        self.db.commit()
        return True

    def import_email_files(self, files: List[UploadFile]) -> List[dict]:
        """
        Importer des emails depuis des fichiers .eml
        """
        results = []
        parser = Parser()
        
        for file in files:
            try:
                content = file.file.read().decode('utf-8')
                msg = parser.parsestr(content)
                
                # Extraire les informations de l'email
                email_data = EmailCreate(
                    external_id=msg.get('Message-ID'),
                    subject=msg.get('Subject'),
                    sender=msg.get('From'),
                    recipients=[msg.get('To')] if msg.get('To') else [],
                    cc=[msg.get('Cc')] if msg.get('Cc') else [],
                    raw_headers=str(msg.items()),
                    raw_body=self._extract_body(msg),
                    snippet=self._extract_snippet(msg)
                )
                
                # Vérifier si l'email n'existe pas déjà
                existing = self.db.query(Email).filter(
                    Email.external_id == email_data.external_id
                ).first()
                
                if not existing:
                    created_email = self.create_email(email_data)
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
