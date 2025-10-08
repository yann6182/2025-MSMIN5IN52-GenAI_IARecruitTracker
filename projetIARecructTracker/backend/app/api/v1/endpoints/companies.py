"""
API endpoints for companies management
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.models.schemas import PaginatedResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupérer la liste des entreprises avec pagination pour l'utilisateur connecté
    """
    try:
        # Pour l'instant, retourner une liste vide avec la structure correcte
        return PaginatedResponse(
            items=[],
            total=0,
            page=page,
            limit=limit,
            pages=0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/{company_id}")
async def get_company(company_id: str, db: Session = Depends(get_db)):
    """
    Récupérer une entreprise par ID
    """
    raise HTTPException(status_code=404, detail="Entreprise non trouvée")

@router.post("/")
async def create_company(db: Session = Depends(get_db)):
    """
    Créer une nouvelle entreprise
    """
    raise HTTPException(status_code=501, detail="Non implémenté")
