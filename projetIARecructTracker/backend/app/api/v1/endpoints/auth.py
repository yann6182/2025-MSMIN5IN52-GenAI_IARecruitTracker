from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.config import settings
from app.models.schemas import UserCreate, UserRead, UserLogin
from app.services.auth_service import (
    create_user, authenticate_user, create_access_token, 
    verify_token, get_user_by_email
)

router = APIRouter()
security = HTTPBearer(auto_error=False)

@router.post("/register", response_model=UserRead, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Inscription d'un nouvel utilisateur"""
    # Vérifier si l'utilisateur existe déjà
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Un utilisateur avec cet email existe déjà"
        )
    
    # Créer l'utilisateur
    return create_user(db=db, user=user)

@router.post("/login")
def login(user_credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    """Connexion d'un utilisateur - définit un cookie HttpOnly"""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)}, 
        expires_delta=access_token_expires
    )
    
    # Définir le cookie HttpOnly avec le token
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=24 * 60 * 60,  # 24 heures en secondes
        samesite="lax",
        secure=False  # True en production avec HTTPS
    )
    
    # Retourner aussi le token pour compatibilité
    return {
        "success": True,
        "message": "Connexion réussie",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active
        }
    }

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Récupérer l'utilisateur actuel à partir du token JWT
    Priorité: 1) Cookie HttpOnly, 2) Header Authorization Bearer
    """
    token = None
    
    # Essayer de récupérer le token depuis le cookie (prioritaire)
    token = request.cookies.get("access_token")
    
    # Si pas de cookie, essayer le header Authorization
    if not token and credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user_by_email(db, email=email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.get("/me", response_model=UserRead)
def read_users_me(current_user = Depends(get_current_user)):
    """Récupérer les informations de l'utilisateur connecté"""
    return current_user

@router.post("/logout")
def logout(response: Response, current_user = Depends(get_current_user)):
    """
    Déconnexion de l'utilisateur - supprime le cookie
    """
    response.delete_cookie(key="access_token")
    return {"success": True, "message": "Déconnexion réussie"}
