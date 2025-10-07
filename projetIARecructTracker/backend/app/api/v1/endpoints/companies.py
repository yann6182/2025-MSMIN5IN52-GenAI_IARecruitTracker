"""
API endpoints for companies management
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas import PaginatedResponse

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Récupérer la liste des entreprises avec pagination
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
