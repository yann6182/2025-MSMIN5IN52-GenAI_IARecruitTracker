# 📧 Intégration Gmail OAuth 2.0

## Vue d'ensemble

Cette application utilise **Gmail OAuth 2.0 API** pour accéder aux emails des utilisateurs de manière sécurisée.

### ✅ Avantages de Gmail OAuth 2.0

- 🔒 **Sécurisé** : Pas besoin de stocker les mots de passe
- 🎯 **Granulaire** : Permissions spécifiques (lecture seule des emails)
- 🔄 **Tokens renouvelables** : Gestion automatique des tokens expirés
- 👤 **Multi-utilisateurs** : Chaque utilisateur autorise son propre compte Gmail

### ❌ IMAP n'est PAS utilisé

L'ancien système IMAP a été remplacé par Gmail OAuth 2.0 :

| Caractéristique | IMAP | Gmail OAuth 2.0 |
|----------------|------|-----------------|
| Sécurité | ⚠️ Mot de passe requis | ✅ Tokens OAuth |
| Configuration | ⚠️ Complexe (App passwords) | ✅ Clic sur "Se connecter avec Gmail" |
| Multi-utilisateurs | ❌ Un seul compte | ✅ Chaque utilisateur son compte |
| Révocation accès | ⚠️ Difficile | ✅ Facile (paramètres Google) |

## 🔧 Architecture

### Backend

```
app/services/
  ├── gmail_oauth_service.py    # Gestion OAuth (autorisation, tokens)
  ├── gmail_api_service.py      # Interaction avec Gmail API (lecture emails)
  └── email_ingestion.py        # [DEPRECATED] Ancien système IMAP
```

### Endpoints principaux

```
POST /api/v1/oauth/gmail/authorize-and-register
  → Inscription + autorisation Gmail en une étape

GET /api/v1/oauth/gmail/callback
  → Callback OAuth après autorisation Google

POST /api/v1/oauth/gmail/sync-emails
  → Synchroniser les emails depuis Gmail

GET /api/v1/oauth/gmail/status
  → Vérifier le statut de connexion Gmail
```

### Frontend

```
src/app/components/
  ├── auth/
  │   ├── login.component.ts              # Bouton "Se connecter avec Gmail"
  │   └── gmail-auth-welcome.component.ts # Page d'accueil Gmail Auth
  └── oauth-callback/
      └── oauth-callback.component.ts     # Traite le retour OAuth
```

## 🚀 Flux utilisateur

1. **Connexion** : L'utilisateur clique sur "Se connecter avec Gmail"
2. **Redirection** : Vers la page de consentement Google
3. **Autorisation** : L'utilisateur accepte les permissions
4. **Callback** : Retour vers l'app avec un code OAuth
5. **Création compte** : Un compte utilisateur est créé automatiquement
6. **Tokens** : Les tokens OAuth sont stockés en DB
7. **Synchronisation** : Les emails sont synchronisés via Gmail API

## 🔐 Permissions demandées

- `gmail.readonly` : Lecture des emails
- `gmail.metadata` : Métadonnées des emails
- `userinfo.email` : Email de l'utilisateur
- `userinfo.profile` : Profil de l'utilisateur

## 📊 Données stockées

Pour chaque utilisateur :
- `gmail_access_token` : Token d'accès (chiffré)
- `gmail_refresh_token` : Token de renouvellement
- `gmail_token_expires_at` : Date d'expiration
- `gmail_email` : Email Gmail connecté
- `gmail_connected` : Statut de connexion

## 🔄 Renouvellement automatique

Les tokens OAuth expirent après 1 heure. Le système renouvelle automatiquement :

```python
async def ensure_valid_token(user: User) -> bool:
    if not self.is_token_valid(user):
        # Renouveler automatiquement avec refresh_token
        return await self.refresh_access_token(user)
    return True
```

## 🎯 Isolation des données

Chaque utilisateur ne voit que ses propres emails :

```python
# Tous les emails sont filtrés par user_id
emails = db.query(Email).filter(Email.user_id == current_user.id).all()
```

## 📝 Configuration requise

### Google Cloud Console

1. Créer un projet Google Cloud
2. Activer Gmail API
3. Créer des identifiants OAuth 2.0
4. Ajouter les URL de redirection autorisées

### Variables d'environnement

```env
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/oauth/gmail/callback
```

## 🐛 Dépannage

### "State OAuth invalide"
- Les états OAuth expirent après 10 minutes
- Recommencez le processus d'autorisation

### "Token expiré"
- Le système renouvelle automatiquement
- Si le refresh_token est invalide, réautorisez Gmail

### "403 Forbidden"
- Vérifiez que l'utilisateur est bien authentifié
- Vérifiez que Gmail est autorisé dans les paramètres Google

## 📚 Documentation

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 pour Applications Web](https://developers.google.com/identity/protocols/oauth2/web-server)
