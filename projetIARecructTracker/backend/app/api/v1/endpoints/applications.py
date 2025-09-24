from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.models.schemas import (
    Application, ApplicationCreate, ApplicationUpdate,
    ApplicationWithEvents, ApplicationFull
)
from app.services.application_service import ApplicationService

router = APIRouter()

@router.get("/", response_model=List[Application])
def get_applications(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(50, ge=1, le=100, description="Nombre d'éléments à retourner"),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    company: Optional[str] = Query(None, description="Filtrer par entreprise"),
    q: Optional[str] = Query(None, description="Recherche textuelle"),
    db: Session = Depends(get_db)
):
    """
    Récupérer la liste des candidatures avec filtres optionnels
    """
    try:
        application_service = ApplicationService(db)
        applications = application_service.get_applications(
            skip=skip, 
            limit=limit, 
            status=status, 
            company=company, 
            search_query=q
        )
        return applications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Application, status_code=201)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db)
):
    """
    Créer une nouvelle candidature
    """
    try:
        application_service = ApplicationService(db)
        return application_service.create_application(application)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{application_id}", response_model=ApplicationFull)
def get_application(
    application_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Récupérer une candidature spécifique avec ses événements et emails
    """
    try:
        application_service = ApplicationService(db)
        application = application_service.get_application_full(application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Candidature non trouvée")
        return application
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{application_id}", response_model=Application)
def update_application(
    application_id: UUID,
    application_update: ApplicationUpdate,
    db: Session = Depends(get_db)
):
    """
    Mettre à jour une candidature
    """
    try:
        application_service = ApplicationService(db)
        updated_application = application_service.update_application(
            application_id, application_update
        )
        if not updated_application:
            raise HTTPException(status_code=404, detail="Candidature non trouvée")
        return updated_application
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{application_id}", status_code=204)
def delete_application(
    application_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Supprimer une candidature
    """
    try:
        application_service = ApplicationService(db)
        success = application_service.delete_application(application_id)
        if not success:
            raise HTTPException(status_code=404, detail="Candidature non trouvée")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{application_id}/events", response_model=List[dict])
def get_application_events(
    application_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Récupérer les événements d'une candidature
    """
    try:
        application_service = ApplicationService(db)
        events = application_service.get_application_events(application_id)
        if events is None:
            raise HTTPException(status_code=404, detail="Candidature non trouvée")
        return events
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
def get_applications_summary(db: Session = Depends(get_db)):
    """
    Récupérer un résumé statistique des candidatures
    """
    try:
        application_service = ApplicationService(db)
        return application_service.get_applications_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
