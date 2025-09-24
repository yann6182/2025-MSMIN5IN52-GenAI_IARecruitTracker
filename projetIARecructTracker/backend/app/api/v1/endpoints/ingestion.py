from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ingestion_service import IngestionService

router = APIRouter()

@router.post("/run")
def run_ingestion(db: Session = Depends(get_db)):
    """
    Déclencher manuellement l'ingestion d'emails
    """
    try:
        ingestion_service = IngestionService(db)
        result = ingestion_service.run_ingestion()
        return {"message": "Ingestion terminée", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def get_ingestion_status(db: Session = Depends(get_db)):
    """
    Récupérer le statut de l'ingestion
    """
    try:
        ingestion_service = IngestionService(db)
        status = ingestion_service.get_ingestion_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classification/retrain")
def retrain_classifier(db: Session = Depends(get_db)):
    """
    Réentraîner le modèle de classification (optionnel)
    """
    try:
        # This would be implemented later when ML model is added
        return {"message": "Réentraînement du modèle non encore implémenté"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
