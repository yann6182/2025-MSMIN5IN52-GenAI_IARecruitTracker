# Configuration Environment

## Setup

1. Copiez le fichier `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Modifiez le fichier `.env` avec vos valeurs personnelles :

### Variables obligatoires à configurer :

#### Base de données
- `DATABASE_URL` : URL de connexion PostgreSQL

#### Gmail API (pour l'ingestion d'emails)
- `GMAIL_CLIENT_ID` : Client ID de l'API Gmail
- `GMAIL_CLIENT_SECRET` : Client Secret de l'API Gmail
- `IMAP_USER` : Votre adresse email Gmail
- `IMAP_PASSWORD` : Mot de passe d'application Gmail

#### Mistral AI (pour l'analyse NLP)
- `MISTRAL_API_KEY` : Clé API Mistral

#### Sécurité
- `JWT_SECRET` : Clé secrète pour JWT (générez une clé aléatoire sécurisée)

## Obtenir les clés API

### Gmail API
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez ou sélectionnez un projet
3. Activez l'API Gmail
4. Créez des identifiants OAuth 2.0
5. Configurez le mot de passe d'application dans votre compte Gmail

### Mistral AI
1. Allez sur [Mistral Console](https://console.mistral.ai/)
2. Créez un compte
3. Générez une clé API

## Sécurité

⚠️ **Important** : 
- Ne jamais commiter le fichier `.env` dans Git
- Utilisez des mots de passe forts
- Régénérez les clés régulièrement
- Le fichier `.env` est automatiquement ignoré par Git
