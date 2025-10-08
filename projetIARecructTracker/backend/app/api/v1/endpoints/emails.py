from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.models.schemas import Email, EmailCreate
from app.models.models import User
from app.services.email_service import EmailService
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Email])
def get_emails(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unlinked: bool = Query(False, description="Afficher uniquement les emails non liés"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupérer la liste des emails de l'utilisateur connecté
    """
    try:
        email_service = EmailService(db)
        return email_service.get_emails(
            user_id=current_user.id,
            skip=skip, 
            limit=limit, 
            unlinked_only=unlinked
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
def import_emails(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Importer des emails depuis des fichiers .eml ou .mbox pour l'utilisateur connecté
    """
    try:
        email_service = EmailService(db)
        results = email_service.import_email_files(files, current_user.id)
        return {"message": f"Import réussi", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/link")
def link_email_to_application(
    email_id: UUID,
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lier un email à une candidature
    """
    try:
        email_service = EmailService(db)
        success = email_service.link_email_to_application(email_id, application_id)
        if not success:
            raise HTTPException(status_code=404, detail="Email ou candidature non trouvé(e)")
        return {"message": "Email lié avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{email_id}", response_model=Email)
def get_email(
    email_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Récupérer un email spécifique
    """
    try:
        email_service = EmailService(db)
        email = email_service.get_email(email_id)
        if not email:
            raise HTTPException(status_code=404, detail="Email non trouvé")
        return email
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
