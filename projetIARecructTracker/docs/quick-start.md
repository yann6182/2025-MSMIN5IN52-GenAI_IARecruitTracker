# 🚀 Guide de démarrage rapide - AI Recruit Tracker

Ce guide vous permettra de démarrer rapidement avec le projet AI Recruit Tracker et ses fonctionnalités NLP.

## ⚡ Démarrage express (5 minutes)

### 1. Prérequis

```bash
# Vérifier les installations
docker --version
docker-compose --version
node --version  # >= 16
python --version  # >= 3.9
```

### 2. Clone et configuration

```bash
# Se placer dans le dossier du projet
cd projetIARecructTracker

# Créer les fichiers d'environnement
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Configuration Mistral AI

Éditez `backend/.env` et ajoutez votre clé API Mistral :

```env
# API Mistral AI (obligatoire pour les fonctionnalités NLP)
MISTRAL_API_KEY=your-mistral-api-key-here

# Configuration par défaut (optionnel)
MISTRAL_EXTRACTION_MODEL=mistral-small-latest
MISTRAL_LARGE_MODEL=mistral-large-latest
MISTRAL_EMBED_MODEL=mistral-embed
MISTRAL_TEMPERATURE=0.1
MISTRAL_MAX_TOKENS=1000
```

> 🔑 **Obtenir une clé API Mistral** :
> 1. Créez un compte sur [console.mistral.ai](https://console.mistral.ai)
> 2. Générez une nouvelle clé API
> 3. Copiez-la dans votre fichier `.env`

### 4. Lancement

```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier que tout fonctionne
docker-compose ps
```

### 5. Accès aux services

- **Frontend** : http://localhost:4200
- **Backend API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs
- **PostgreSQL** : localhost:5432 (user: `postgres`, password: `postgres`)

## 🧪 Test des fonctionnalités NLP

### Test rapide via l'API

```bash
# Test de classification d'email
curl -X POST "http://localhost:8000/api/v1/nlp/classify" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Accusé de réception de votre candidature",
    "body": "Nous avons bien reçu votre candidature pour le poste de Développeur Python.",
    "sender_email": "rh@techcorp.com"
  }'
```

### Test via l'interface Swagger

1. Ouvrez http://localhost:8000/docs
2. Naviguez vers la section "NLP"
3. Testez l'endpoint `/api/v1/nlp/process`

## 📊 Données de test

### Créer des candidatures de test

```bash
# Exécuter le script de données de test
docker-compose exec backend python scripts/seed_data.py
```

Cela créera :
- 10 entreprises fictives
- 20 offres d'emploi
- 50 candidatures avec différents statuts
- 100 emails de test pour tester les fonctionnalités NLP

## 🔧 Développement

### Structure du projet

```
projetIARecructTracker/
├── backend/           # API FastAPI
│   ├── app/
│   │   ├── api/       # Endpoints REST
│   │   ├── core/      # Configuration & utilitaires
│   │   ├── models/    # Modèles SQLAlchemy
│   │   ├── nlp/       # Services NLP Mistral AI
│   │   └── services/  # Logique métier
│   └── requirements.txt
├── frontend/          # Application Angular
│   ├── src/app/
│   │   ├── components/
│   │   ├── services/
│   │   └── models/
│   └── package.json
├── infra/            # Configuration Docker
└── docs/             # Documentation
```

### Commandes utiles

```bash
# Logs en temps réel
docker-compose logs -f backend
docker-compose logs -f frontend

# Redémarrer un service
docker-compose restart backend

# Accéder au shell backend
docker-compose exec backend bash

# Migrations de base de données
docker-compose exec backend alembic upgrade head

# Tests
docker-compose exec backend pytest
docker-compose exec frontend npm test
```

## 🎯 Fonctionnalités principales

### 📧 Traitement automatique des emails

- **Extraction** : Entreprise, poste, contact, dates
- **Classification** : ACK, REJECTED, INTERVIEW, OFFER, etc.
- **Matching** : Liaison automatique email ↔ candidature
- **Actions automatiques** : Changement de statut, création de rappels

### 🔍 Dashboard de suivi

- Vue d'ensemble des candidatures
- Statistiques en temps réel
- Timeline des interactions
- Alertes et rappels intelligents

### 🤖 Intelligence artificielle

- Mistral AI pour l'analyse des emails
- Approche hybride (règles + IA) pour optimiser les coûts
- Matching sémantique avec embeddings
- Confiance calculée automatiquement

## 🐛 Dépannage

### Problèmes courants

#### Les services ne démarrent pas
```bash
# Nettoyer et reconstruire
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

#### Erreur de base de données
```bash
# Réinitialiser la base
docker-compose down -v
docker volume rm $(docker volume ls -q | grep postgres)
docker-compose up -d db
# Attendre 30s puis
docker-compose up -d backend
```

#### Erreur Mistral API
```bash
# Vérifier la configuration
docker-compose exec backend python -c "
import os
print('MISTRAL_API_KEY:', os.getenv('MISTRAL_API_KEY')[:10] + '...' if os.getenv('MISTRAL_API_KEY') else 'Non définie')
"
```

### Logs détaillés

```bash
# Activer les logs debug
echo "LOG_LEVEL=DEBUG" >> backend/.env
docker-compose restart backend

# Suivre les logs NLP
docker-compose logs -f backend | grep "nlp"
```

## 📚 Documentation détaillée

- [Architecture complète](./architecture.md)
- [Fonctionnalités NLP](./nlp-features.md)
- [Guide API](./api-guide.md)
- [Déploiement production](./deployment.md)

## 🤝 Contribution

### Workflow de développement

1. Créer une branche feature
2. Développer et tester localement
3. Vérifier les tests passent
4. Créer une pull request

### Standards de code

```bash
# Backend (Python)
docker-compose exec backend black . --check
docker-compose exec backend flake8
docker-compose exec backend mypy .

# Frontend (TypeScript)
docker-compose exec frontend npm run lint
docker-compose exec frontend npm run format:check
```

## 🆘 Support

- **Issues GitHub** : Pour les bugs et améliorations
- **Documentation** : Dossier `/docs`
- **Logs** : `docker-compose logs [service]`

---

✨ **Bon développement avec AI Recruit Tracker !**
