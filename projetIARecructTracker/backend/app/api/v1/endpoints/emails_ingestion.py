from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel
from app.core.database import get_db
from app.services.email_ingestion import EmailIngestionService
from app.services.email_to_application_service import EmailToApplicationService
from app.nlp.nlp_orchestrator import NLPOrchestrator
from loguru import logger

router = APIRouter()

class EmailIngestionRequest(BaseModel):
    days_back: int = 30
    analyze_after_ingestion: bool = True
    create_applications: bool = True

@router.post("/ingest")
async def ingest_emails(
    request: EmailIngestionRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Ingérer les emails depuis la boîte mail de l'utilisateur
    """
    try:
        # Service d'ingestion
        ingestion_service = EmailIngestionService(db)
        
        # Ingérer les emails
        result = ingestion_service.ingest_emails(days_back=request.days_back)
        
        # Si des emails ont été ingérés et que l'analyse est demandée
        if result["emails_saved"] > 0 and request.analyze_after_ingestion:
            logger.info("Starting NLP analysis of newly ingested emails")
            
            # Analyser les nouveaux emails
            orchestrator = NLPOrchestrator(db)
            
            # Récupérer les emails non classifiés
            from app.models.models import Email
            unclassified_emails = db.query(Email).filter(
                Email.classification.is_(None)
            ).all()
            
            processed_count = 0
            errors = []
            
            for email in unclassified_emails:
                try:
                    await orchestrator.process_email_complete(email)
                    processed_count += 1
                except Exception as e:
                    errors.append(f"Email {email.id}: {str(e)}")
            
            result["analysis"] = {
                "processed_count": processed_count,
                "errors": errors
            }
            
            logger.info(f"Analyzed {processed_count} emails")
            
            # Créer des candidatures à partir des emails classifiés si demandé
            if request.create_applications:
                logger.info("Starting automatic application creation from classified emails")
                
                app_service = EmailToApplicationService(db)
                app_results = app_service.process_classified_emails()
                
                result["applications"] = app_results
                logger.info(f"Created {app_results['created_applications']} applications, linked {app_results['linked_applications']} emails")
        
        return result
        
    except Exception as e:
        logger.error(f"Email ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-connection")
async def test_email_connection(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Tester la connexion IMAP
    """
    try:
        ingestion_service = EmailIngestionService(db)
        mail = ingestion_service.connect_imap()
        
        if mail:
            try:
                mail.close()
                mail.logout()
            except:
                pass
            
            return {
                "success": True,
                "message": "IMAP connection successful"
            }
        else:
            return {
                "success": False,
                "message": "Failed to connect to IMAP server"
            }
            
    except Exception as e:
        logger.error(f"IMAP connection test failed: {e}")
        return {
            "success": False,
            "message": f"Connection error: {str(e)}"
        }

@router.post("/process-to-applications")
async def process_emails_to_applications(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Traiter les emails classifiés pour créer automatiquement des candidatures
    """
    try:
        app_service = EmailToApplicationService(db)
        results = app_service.process_classified_emails()
        
        return {
            "success": True,
            "message": f"Processed {results['processed']} emails into applications",
            "details": results
        }
        
    except Exception as e:
        logger.error(f"Email to application processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unprocessed-count")
async def get_unprocessed_emails_count(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Obtenir le nombre d'emails classifiés qui n'ont pas encore de candidature associée
    """
    try:
        app_service = EmailToApplicationService(db)
        count = app_service.get_unprocessed_emails_count()
        
        return {
            "unprocessed_count": count
        }
        
    except Exception as e:
        logger.error(f"Failed to get unprocessed emails count: {e}")
        raise HTTPException(status_code=500, detail=str(e))
