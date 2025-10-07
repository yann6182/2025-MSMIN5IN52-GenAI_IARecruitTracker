from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from app.core.database import get_db
from app.nlp.nlp_orchestrator import NLPOrchestrator
from app.nlp.matching_service import EmailMatchingService
from app.models.models import Email
from pydantic import BaseModel

router = APIRouter()

class EmailProcessingRequest(BaseModel):
    subject: str
    body: str
    sender_email: str = ""

class MatchingRequest(BaseModel):
    email_subject: str
    email_body: str
    sender_email: str = ""

class BatchProcessRequest(BaseModel):
    days_back: Optional[int] = 30  # Nombre de jours dans le passé
    hours_back: Optional[int] = None  # Nombre d'heures dans le passé (prioritaire si fourni)
    force_reprocess: bool = False  # Forcer le retraitement même si déjà traité

@router.post("/process")
async def process_email_nlp(
    email_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Traiter un email avec tous les services NLP
    """
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    orchestrator = NLPOrchestrator(db)
    result = await orchestrator.process_email_complete(email)
    
    return result

@router.post("/extract")
async def extract_entities(
    request: EmailProcessingRequest,
    db: Session = Depends(get_db)
):
    """
    Extraire les entités d'un email
    """
    from app.nlp.extraction_service import EmailExtractionService
    
    service = EmailExtractionService()
    entities = await service.extract_entities(
        request.subject, 
        request.body, 
        request.sender_email
    )
    
    return entities

@router.post("/classify")
async def classify_email(
    request: EmailProcessingRequest,
    db: Session = Depends(get_db)
):
    """
    Classifier un email
    """
    from app.nlp.classification_service import EmailClassificationService
    
    service = EmailClassificationService()
    classification = await service.classify_email(
        request.subject,
        request.body,
        request.sender_email
    )
    
    return classification

@router.post("/match")
async def find_matching_applications(
    request: MatchingRequest,
    db: Session = Depends(get_db)
):
    """
    Trouver les candidatures correspondant à un email
    """
    matching_service = EmailMatchingService(db)
    matches = await matching_service.find_matching_applications(
        request.email_subject,
        request.email_body,
        request.sender_email
    )
    
    return {"matches": matches}

@router.post("/reprocess/{email_id}")
async def reprocess_email(
    email_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Retraiter un email avec les services NLP
    """
    orchestrator = NLPOrchestrator(db)
    result = await orchestrator.reprocess_email(str(email_id))
    
    return result

@router.get("/stats")
async def get_nlp_stats(db: Session = Depends(get_db)):
    """
    Statistiques sur le traitement NLP des emails
    """
    # Statistiques sur les emails traités
    total_emails = db.query(Email).count()
    classified_emails = db.query(Email).filter(Email.classification.isnot(None)).count()
    linked_emails = db.query(Email).filter(Email.application_id.isnot(None)).count()
    
    # Répartition par type de classification
    from sqlalchemy import func
    classification_stats = db.query(
        Email.classification,
        func.count(Email.id).label('count')
    ).filter(Email.classification.isnot(None)).group_by(Email.classification).all()
    
    return {
        "total_emails": total_emails,
        "classified_emails": classified_emails,
        "linked_emails": linked_emails,
        "classification_rate": classified_emails / total_emails if total_emails > 0 else 0,
        "linking_rate": linked_emails / total_emails if total_emails > 0 else 0,
        "classification_breakdown": {
            result.classification: result.count for result in classification_stats
        }
    }

@router.post("/batch-process")
async def batch_process_emails(
    request: BatchProcessRequest,
    db: Session = Depends(get_db)
):
    """
    Traiter en lot les emails d'un intervalle de temps donné
    """
    # Calculer la date de début selon l'intervalle
    if request.hours_back is not None:
        start_date = datetime.utcnow() - timedelta(hours=request.hours_back)
    else:
        start_date = datetime.utcnow() - timedelta(days=request.days_back or 30)
    
    # Récupérer les emails dans l'intervalle
    query = db.query(Email).filter(Email.created_at >= start_date)
    
    # Si force_reprocess est False, exclure les emails déjà traités
    if not request.force_reprocess:
        query = query.filter(Email.classification.is_(None))
    
    emails_to_process = query.all()
    
    if not emails_to_process:
        return {
            "message": "Aucun email à traiter dans l'intervalle spécifié",
            "processed_count": 0,
            "total_found": 0,
            "interval": f"Derniers {request.hours_back} heures" if request.hours_back else f"Derniers {request.days_back} jours"
        }
    
    # Traiter les emails avec l'orchestrateur
    orchestrator = NLPOrchestrator(db)
    processed_count = 0
    errors = []
    
    for email in emails_to_process:
        try:
            await orchestrator.process_email_complete(email)
            processed_count += 1
        except Exception as e:
            errors.append(f"Email {email.id}: {str(e)}")
    
    return {
        "message": f"Traitement terminé",
        "processed_count": processed_count,
        "total_found": len(emails_to_process),
        "errors": errors,
        "interval": f"Derniers {request.hours_back} heures" if request.hours_back else f"Derniers {request.days_back} jours"
    }
