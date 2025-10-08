# 🤖 AI Recruit Tracker - Suivi Intelligent de Candidatures

> Un système de suivi des candidatures d'emploi propulsé par l'IA Mistral, automatisant le traitement et la classification des emails de recrutement.

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?logo=fastapi)
![Angular](https://img.shields.io/badge/Angular-17+-red?logo=angular)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)
![Mistral AI](https://img.shields.io/badge/Mistral_AI-Integrated-orange)

## ✨ Fonctionnalités principales

### 🧠 Intelligence Artificielle Avancée
- **Extraction d'entités** : Détection automatique des entreprises, postes, contacts et dates
- **Classification d'emails** : Reconnaissance automatique des types (ACK, REJECTION, INTERVIEW, OFFER)
- **Matching sémantique** : Liaison intelligente emails ↔ candidatures via embeddings
- **Actions automatiques** : Changements de statut et notifications intelligentes

### 📊 Tableau de Bord Complet  
- Vue d'ensemble des candidatures avec statistiques temps réel
- Timeline interactive des interactions par candidature
- Alertes et rappels intelligents basés sur l'analyse IA
- Métriques de performance du processus de candidature

## 🚀 Démarrage rapide (5 minutes)

### Prérequis
```bash
docker --version        # >= 20.10
docker-compose --version # >= 2.0
```

### Installation express
```bash
# 1. Naviguer dans le projet
cd projetIARecructTracker

# 2. Configuration environnement
cp backend/.env.example backend/.env
# Éditez backend/.env et ajoutez votre MISTRAL_API_KEY

# 3. Démarrage complet
docker-compose up -d

# 4. Vérification installation
python scripts/check_install.py
```

### Accès aux services
- 🌐 **Application** : <http://localhost:4200>
- 📚 **API Docs** : <http://localhost:8000/docs>  
- 🔍 **Health Check** : <http://localhost:8000/health>

### Test des fonctionnalités IA
```bash
# Créer des données de test
python scripts/seed_data.py

# Tester les services NLP
python scripts/test_nlp.py
```

## 🎯 Objectif

Centraliser, classer et suivre automatiquement l'évolution des candidatures (accusés de réception, refus, convocations, relances) depuis la **boîte mail** et via un **dashboard** web.

## 🏗️ Architecture

- **Backend**: FastAPI (Python) avec PostgreSQL
- **Frontend**: Angular avec Angular Material
- **Infrastructure**: Docker Compose
- **Base de données**: PostgreSQL avec migrations Alembic

## 🚀 Démarrage rapide

### Prérequis

- Docker et Docker Compose installés
- Node.js 18+ (pour le développement frontend)
- Python 3.11+ (pour le développement backend)

### Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd projetIARecructTracker
   ```

2. **Configurer les variables d'environnement**
   ```bash
   # Éditer les fichiers dans infra/env/
   # - db.env : configuration PostgreSQL
   # - backend.env : configuration API et services
   # - frontend.env : configuration Angular
   ```

3. **Démarrer l'application**
   ```bash
   ./scripts/start.sh
   ```

4. **Accéder aux services**
   - 🌍 Frontend: http://localhost:4200
   - 🔧 Backend API: http://localhost:8000
   - 📚 Documentation API: http://localhost:8000/docs

**Problème :** suivre des dizaines de candidatures via emails est chronophage (perte d'historique, oublis de relance).it Tracker — README (Light)

Gestion intelligente des candidatures à partir des **emails** et d’actions manuelles.  
Stack : **FastAPI** (Python) · **PostgreSQL** · **Angular** · **Docker Compose**

---

## 1) But du projet

**Problème :** suivre des dizaines de candidatures via emails est chronophage (perte d’historique, oublis de relance).  
**Solution :** une appli qui **ingère** les emails, **extrait** les infos clés, **met à jour** le statut des candidatures et propose un **dashboard** clair pour suivre et corriger.

---

## 2) Périmètre (MVP)

- Connexion à une boîte mail (Gmail/IMAP) **ou** import manuel (`.eml/.mbox`).  
- Extraction : **entreprise**, **intitulé de poste**, **dates** et **contacts**.  
- Classification par règles simples : `APPLIED`, `ACKNOWLEDGED`, `SCREENING`, `INTERVIEW`, `OFFER`, `REJECTED`, `ON_HOLD`, `WITHDRAWN`.  
- **Dashboard Angular** : liste + filtre + détail avec timeline d’événements.  
- **Relances** basiques : calcul de `next_action_at` (ex. J+7 sans réponse).

> Objectif MVP : ingestion + règles FR/EN + CRUD candidatures + UI liste/détail.

---

## 3) Stack & modules

- **Backend :** FastAPI, SQLAlchemy, Alembic, scheduler (APScheduler).  
- **Base :** PostgreSQL.  
- **Frontend :** Angular (tableau, filtres, détail).  
- **Conteneurisation :** Docker Compose.
- (Optionnel) Classif. légère : scikit-learn (LogReg / LinearSVC) + TF‑IDF.

---

## 4) Architecture (vue simple)
az
Angular (UI) ⟶ FastAPI (API REST + jobs d’ingestion) ⟶ PostgreSQL (données)

Connecteurs mails : Gmail API / IMAP (pull périodique) ou import manuel.

---

## 5) Modèle de données (résumé)

```sql
-- applications
id (uuid, pk), company_name, job_title, status, next_action_at, created_at

-- emails
id (uuid, pk), application_id (fk), external_id, subject, sender, sent_at, snippet, classification

-- application_events
id (uuid, pk), application_id (fk), event_type, payload(jsonb), created_at
```

---

## 6) Endpoints principaux (extraits)

- `GET /api/v1/applications` (filtres: status, q, company)  
- `POST /api/v1/applications`  
- `GET /api/v1/applications/{id}` & `GET /api/v1/applications/{id}/events`  
- `GET /api/v1/emails?unlinked=true`  
- `POST /api/v1/emails/import` (upload .eml/.mbox)  
- `POST /api/v1/ingestion/run` (pull immédiat)

---

## 7) Démarrage rapide (Docker)

**Arbo minimale**
```
ai-recruit-tracker/
  backend/
  frontend/
  infra/
    docker-compose.yml
    env/
      db.env
      backend.env
      frontend.env
```

**infra/docker-compose.yml**
```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    env_file: ./env/db.env
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ["5432:5432"]

  backend:
    build: ../backend
    env_file: ./env/backend.env
    depends_on:
      - db
    ports: ["8000:8000"]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  frontend:
    build: ../frontend
    depends_on:
      - backend
    ports: ["4200:80"]

volumes:
  pgdata:
```

**infra/env/db.env**
```
POSTGRES_USER=airtrack
POSTGRES_PASSWORD=airtrackpwd
POSTGRES_DB=airtrackdb
```

**infra/env/backend.env**
```
DATABASE_URL=postgresql+psycopg://airtrack:airtrackpwd@db:5432/airtrackdb
ALLOWED_ORIGINS=http://localhost:4200
```

**infra/env/frontend.env**
```
API_BASE_URL=http://localhost:8000/api/v1
```

---

## 8) Roadmap courte

- **S1** : CRUD + schéma + liste/détail Angular.  
- **S2** : import `.eml` + règles FR/EN + timeline.  
- **S3** : connecteur IMAP/Gmail + scheduler + relances.

---

## 9) Licence

À définir selon le contexte.
