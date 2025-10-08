"""
API endpoints for Gmail OAuth authentication
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app.core.database import get_db
from app.models.models import User
from app.services.gmail_oauth_service import GmailOAuthService
from app.api.v1.endpoints.auth import get_current_user
from app.services.auth_service import verify_token, get_user_by_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

def get_user_from_token(token: str, db: Session) -> User:
    """
    Valide un token JWT et retourne l'utilisateur correspondant
    """
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Token invalide"
        )
    
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=401,
            detail="Token invalide"
        )
    
    user = get_user_by_email(db, email=email)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Utilisateur non trouvé"
        )
    
    return user


@router.get("/gmail/authorize-and-register")
async def authorize_gmail_and_register(
    db: Session = Depends(get_db)
):
    """
    Autorisation Gmail avec création automatique de compte utilisateur
    
    Cette route permet à un nouvel utilisateur de s'inscrire ET d'autoriser Gmail en une seule étape.
    L'utilisateur sera redirigé vers Google OAuth, et à son retour, un compte sera créé automatiquement
    si il n'existe pas déjà.
    """
    try:
        # Démarrer le processus OAuth sans authentification préalable
        # L'utilisateur sera créé lors du callback
        oauth_service = GmailOAuthService(db)
        
        # Utiliser la méthode spécifique pour l'inscription qui génère le bon state
        auth_url, state = oauth_service.generate_registration_url()
            
        logger.info(f"Redirection vers autorisation Gmail avec inscription: {auth_url}")
        return RedirectResponse(url=auth_url)
        
    except Exception as e:
        logger.error(f"Erreur lors de l'autorisation Gmail avec inscription: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'autorisation Gmail: {str(e)}"
        )

@router.get("/gmail/authorize")
async def authorize_gmail(
    token: Optional[str] = Query(None, description="JWT token pour l'authentification OAuth"),
    db: Session = Depends(get_db)
):
    """
    Initie le processus d'autorisation OAuth avec Gmail
    
    Redirige l'utilisateur vers la page d'autorisation Google
    """
    try:
        # Récupérer l'utilisateur soit depuis le token en query param soit depuis les headers
        current_user = None
        
        if token:
            # Authentification via token en query parameter
            current_user = get_user_from_token(token, db)
        else:
            # Essayer l'authentification via header (si disponible)
            try:
                from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
                from fastapi import Request
                security = HTTPBearer(auto_error=False)
                # Ici on pourrait vérifier les headers mais pour simplifier on demande le token en query
                pass
            except:
                pass
        
        if current_user is None:
            raise HTTPException(
                status_code=401,
                detail="Authentification requise pour l'autorisation Gmail. Veuillez vous connecter."
            )
            
        oauth_service = GmailOAuthService(db)
        authorization_url, state = oauth_service.generate_authorization_url(current_user.id)
        
        logger.info(f"Redirection OAuth pour l'utilisateur {current_user.id}: {authorization_url}")
        
        # Rediriger vers Google OAuth
        return RedirectResponse(url=authorization_url)
        
    except Exception as e:
        logger.error(f"Erreur lors de l'initiation OAuth: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'initiation de l'autorisation Gmail: {str(e)}"
        )


@router.get("/gmail/callback")
async def gmail_oauth_callback(
    code: str = Query(..., description="Code d'autorisation retourné par Google"),
    state: str = Query(..., description="State pour vérifier la sécurité"),
    error: str = Query(None, description="Erreur retournée par Google"),
    db: Session = Depends(get_db)
):
    """
    Gère le callback OAuth de Google
    
    Échange le code d'autorisation contre des tokens d'accès
    """
    try:
        # Vérifier s'il y a une erreur
        if error:
            logger.warning(f"Erreur OAuth reçue: {error}")
            # Rediriger vers le frontend avec l'erreur
            return RedirectResponse(
                url=f"http://localhost:4200/oauth-callback?error={error}",
                status_code=302
            )
        
        oauth_service = GmailOAuthService(db)
        result = await oauth_service.handle_oauth_callback(code, state)
        
        if result["success"]:
            logger.info(f"OAuth callback réussi: {result['user_email']}")
            
            # Générer un token JWT pour connecter l'utilisateur automatiquement
            from app.services.auth_service import create_access_token
            from datetime import timedelta
            
            access_token_expires = timedelta(hours=24)
            access_token = create_access_token(
                data={"sub": result['user_email'], "user_id": str(result['user_id'])}, 
                expires_delta=access_token_expires
            )
            
            # Construire l'URL de callback avec le token
            callback_url = "http://localhost:4200/oauth-callback?success=true"
            callback_url += f"&email={result['user_email']}"
            callback_url += f"&token={access_token}"
            
            if result.get("is_new_user"):
                callback_url += "&new_user=true"
            
            # Rediriger vers le frontend avec succès
            return RedirectResponse(
                url=callback_url,
                status_code=302
            )
        else:
            # Rediriger vers le frontend avec erreur
            return RedirectResponse(
                url=f"http://localhost:4200/oauth-callback?error=authorization_failed",
                status_code=302
            )
            
    except Exception as e:
        logger.error(f"Erreur lors du callback OAuth: {str(e)}")
        
        # Rediriger vers le frontend avec erreur
        return RedirectResponse(
            url=f"http://localhost:4200/oauth-callback?error=callback_error",
            status_code=302
        )


@router.get("/gmail/status", response_model=Dict[str, Any])
async def get_gmail_oauth_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère le statut de la connexion OAuth Gmail pour l'utilisateur
    """
    try:
        oauth_service = GmailOAuthService(db)
        status = oauth_service.get_oauth_status(current_user)
        
        return {
            "success": True,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du statut OAuth: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération du statut: {str(e)}"
        )


@router.post("/gmail/disconnect", response_model=Dict[str, Any])
async def disconnect_gmail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Déconnecte le compte Gmail de l'utilisateur
    """
    try:
        oauth_service = GmailOAuthService(db)
        success = oauth_service.disconnect_gmail(current_user)
        
        if success:
            return {
                "success": True,
                "message": "Compte Gmail déconnecté avec succès"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Erreur lors de la déconnexion du compte Gmail"
            )
            
    except Exception as e:
        logger.error(f"Erreur lors de la déconnexion Gmail: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la déconnexion: {str(e)}"
        )


@router.post("/gmail/refresh-token", response_model=Dict[str, Any])
async def refresh_gmail_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rafraîchit manuellement le token d'accès Gmail
    """
    try:
        oauth_service = GmailOAuthService(db)
        success = await oauth_service.refresh_access_token(current_user)
        
        if success:
            return {
                "success": True,
                "message": "Token Gmail rafraîchi avec succès"
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Impossible de rafraîchir le token. Réautorisation nécessaire."
            )
            
    except Exception as e:
        logger.error(f"Erreur lors du rafraîchissement du token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du rafraîchissement du token: {str(e)}"
        )


@router.get("/gmail/test-connection", response_model=Dict[str, Any])
async def test_gmail_connection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Teste la connexion Gmail en tentant d'accéder à l'API
    """
    try:
        from app.services.gmail_api_service import GmailAPIService
        
        oauth_service = GmailOAuthService(db)
        gmail_service = GmailAPIService(db)
        
        # Vérifier et rafraîchir le token si nécessaire
        token_valid = await oauth_service.ensure_valid_token(current_user)
        
        if not token_valid:
            return {
                "success": False,
                "message": "Token non valide. Réautorisation nécessaire.",
                "requires_auth": True
            }
        
        # Test simple: récupérer le profil Gmail
        profile = await gmail_service.get_user_profile(current_user)
        
        return {
            "success": True,
            "message": "Connexion Gmail active",
            "token_valid": True,
            "requires_auth": False,
            "gmail_profile": {
                "email": profile.get("emailAddress"),
                "total_messages": profile.get("messagesTotal", 0),
                "threads_total": profile.get("threadsTotal", 0)
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur lors du test de connexion Gmail: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du test de connexion: {str(e)}"
        )


@router.post("/gmail/sync-emails", response_model=Dict[str, Any])
async def sync_emails_from_gmail(
    max_emails: int = Query(100, ge=1, le=500, description="Nombre maximum d'emails à synchroniser"),
    days_back: int = Query(30, ge=1, le=365, description="Nombre de jours dans le passé"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synchronise les emails depuis Gmail
    """
    try:
        from app.services.gmail_api_service import GmailAPIService
        
        gmail_service = GmailAPIService(db)
        result = await gmail_service.sync_emails_from_gmail(current_user, max_emails, days_back)
        
        return result
        
    except Exception as e:
        logger.error(f"Erreur lors de la synchronisation des emails: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la synchronisation: {str(e)}"
        )
