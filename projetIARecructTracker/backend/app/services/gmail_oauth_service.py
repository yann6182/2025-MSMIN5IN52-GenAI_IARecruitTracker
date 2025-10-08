"""
Service pour gérer l'authentification OAuth 2.0 avec Gmail
"""
import os
import secrets
import json
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from urllib.parse import urlencode
import httpx
from sqlalchemy.orm import Session
from app.models.models import User
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class GmailOAuthService:
    """
    Service pour gérer le flow OAuth 2.0 avec Gmail
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.client_id = settings.GMAIL_CLIENT_ID
        self.client_secret = settings.GMAIL_CLIENT_SECRET
        self.redirect_uri = f"{settings.BACKEND_URL}/api/v1/oauth/gmail/callback"
        
        # Scopes Gmail nécessaires pour lire les emails
        self.scopes = [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.metadata",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ]
        
        # URLs OAuth Google
        self.auth_base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v1/userinfo"
        
        # Stockage temporaire des states OAuth (en production, utiliser Redis)
        self._oauth_states = {}

    def generate_authorization_url(self, user_id: int) -> Tuple[str, str]:
        """
        Génère l'URL d'autorisation OAuth pour Gmail
        
        Returns:
            Tuple[str, str]: (authorization_url, state)
        """
        # Générer un state unique pour sécuriser la requête
        state = secrets.token_urlsafe(32)
        
        # Stocker le state avec l'user_id (temporairement)
        self._oauth_states[state] = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        }
        
        # Paramètres OAuth
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": " ".join(self.scopes),
            "response_type": "code",
            "state": state,
            "access_type": "offline",  # Pour obtenir un refresh token
            "prompt": "consent",  # Force l'affichage de l'écran de consentement
            "include_granted_scopes": "true"
        }
        
        authorization_url = f"{self.auth_base_url}?{urlencode(params)}"
        
        logger.info(f"Generated OAuth authorization URL for user {user_id}")
        return authorization_url, state

    async def handle_oauth_callback(self, code: str, state: str) -> Dict[str, any]:
        """
        Traite le callback OAuth et échange le code contre des tokens
        
        Args:
            code: Code d'autorisation reçu de Google
            state: State pour vérifier la sécurité de la requête
            
        Returns:
            Dict contenant les informations de l'utilisateur et le statut
        """
        try:
            # Vérifier le state
            if state not in self._oauth_states:
                raise ValueError("State OAuth invalide ou expiré")
                
            state_data = self._oauth_states[state]
            
            # Vérifier l'expiration
            if datetime.utcnow() > state_data["expires_at"]:
                del self._oauth_states[state]
                raise ValueError("State OAuth expiré")
                
            user_id = state_data["user_id"]
            
            # Nettoyer le state utilisé
            del self._oauth_states[state]
            
            # Échanger le code contre des tokens
            token_data = await self._exchange_code_for_tokens(code)
            
            # Récupérer les informations utilisateur
            user_info = await self._get_user_info(token_data["access_token"])
            
            # Sauvegarder les tokens dans la base de données
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError("Utilisateur non trouvé")
                
            # Mettre à jour les tokens OAuth de l'utilisateur
            user.gmail_access_token = token_data["access_token"]
            user.gmail_refresh_token = token_data.get("refresh_token")
            user.gmail_token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
            user.gmail_connected = True
            user.gmail_email = user_info.get("email")
            
            # Ajouter les scopes accordés
            if "scope" in token_data:
                user.gmail_scopes = token_data["scope"]
            else:
                user.gmail_scopes = " ".join(self.scopes)
                
            self.db.commit()
            
            logger.info(f"Gmail OAuth connecté avec succès pour l'utilisateur {user_id}, email: {user_info.get('email')}")
            
            return {
                "success": True,
                "message": "Compte Gmail connecté avec succès",
                "user_email": user_info.get("email"),
                "granted_scopes": user.gmail_scopes
            }
            
        except Exception as e:
            logger.error(f"Erreur lors du callback OAuth: {str(e)}")
            raise Exception(f"Erreur lors de la connexion Gmail: {str(e)}")

    async def _exchange_code_for_tokens(self, code: str) -> Dict[str, any]:
        """
        Échange le code d'autorisation contre des tokens d'accès
        """
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data=token_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                logger.error(f"Erreur échange token: {response.status_code} - {response.text}")
                raise Exception(f"Erreur lors de l'échange du code: {response.status_code}")
                
            return response.json()

    async def _get_user_info(self, access_token: str) -> Dict[str, any]:
        """
        Récupère les informations de l'utilisateur depuis l'API Google
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.userinfo_url, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Erreur récupération user info: {response.status_code} - {response.text}")
                raise Exception(f"Erreur lors de la récupération des informations utilisateur: {response.status_code}")
                
            return response.json()

    async def refresh_access_token(self, user: User) -> bool:
        """
        Rafraîchit le token d'accès d'un utilisateur
        
        Args:
            user: Utilisateur dont le token doit être rafraîchi
            
        Returns:
            bool: True si le rafraîchissement a réussi
        """
        if not user.gmail_refresh_token:
            logger.warning(f"Pas de refresh token pour l'utilisateur {user.id}")
            return False
            
        try:
            refresh_data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": user.gmail_refresh_token,
                "grant_type": "refresh_token"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=refresh_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code != 200:
                    logger.error(f"Erreur refresh token: {response.status_code} - {response.text}")
                    return False
                    
                token_data = response.json()
                
                # Mettre à jour le token d'accès
                user.gmail_access_token = token_data["access_token"]
                user.gmail_token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                
                # Nouveau refresh token s'il est fourni
                if "refresh_token" in token_data:
                    user.gmail_refresh_token = token_data["refresh_token"]
                    
                self.db.commit()
                
                logger.info(f"Token Gmail rafraîchi avec succès pour l'utilisateur {user.id}")
                return True
                
        except Exception as e:
            logger.error(f"Erreur lors du rafraîchissement du token: {str(e)}")
            return False

    def is_token_valid(self, user: User) -> bool:
        """
        Vérifie si le token d'accès de l'utilisateur est encore valide
        """
        if not user.gmail_access_token or not user.gmail_token_expires_at:
            return False
            
        # Ajouter une marge de 5 minutes
        expiry_with_buffer = user.gmail_token_expires_at - timedelta(minutes=5)
        return datetime.utcnow() < expiry_with_buffer

    async def ensure_valid_token(self, user: User) -> bool:
        """
        S'assure que l'utilisateur a un token valide, le rafraîchit si nécessaire
        
        Returns:
            bool: True si un token valide est disponible
        """
        if self.is_token_valid(user):
            return True
            
        if user.gmail_refresh_token:
            return await self.refresh_access_token(user)
            
        logger.warning(f"Utilisateur {user.id} n'a pas de token valide et pas de refresh token")
        return False

    def disconnect_gmail(self, user: User) -> bool:
        """
        Déconnecte le compte Gmail de l'utilisateur
        """
        try:
            user.gmail_access_token = None
            user.gmail_refresh_token = None
            user.gmail_token_expires_at = None
            user.gmail_connected = False
            user.gmail_email = None
            user.gmail_scopes = None
            
            self.db.commit()
            
            logger.info(f"Gmail déconnecté pour l'utilisateur {user.id}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de la déconnexion Gmail: {str(e)}")
            return False

    def get_oauth_status(self, user: User) -> Dict[str, any]:
        """
        Retourne le statut de la connexion OAuth Gmail pour un utilisateur
        """
        return {
            "connected": user.gmail_connected,
            "email": user.gmail_email,
            "token_valid": self.is_token_valid(user),
            "expires_at": user.gmail_token_expires_at.isoformat() if user.gmail_token_expires_at else None,
            "scopes": user.gmail_scopes.split(" ") if user.gmail_scopes else []
        }
