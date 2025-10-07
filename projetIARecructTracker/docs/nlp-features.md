# Fonctionnalités NLP avec Mistral AI

Ce document décrit l'implémentation des fonctionnalités d'intelligence artificielle pour le traitement automatique des emails de recrutement.

## 🧠 Vue d'ensemble

Le système utilise **Mistral AI** pour traiter automatiquement les emails et améliorer le suivi des candidatures :

- **Extraction d'entités** : Entreprise, poste, contact, dates, localisation
- **Classification d'emails** : ACK, REJECTED, INTERVIEW, OFFER, REQUEST, OTHER
- **Matching sémantique** : Rapprochement email ↔ candidature avec embeddings

## 🔧 Architecture NLP

```
EmailService → NLPOrchestrator → [ExtractionService, ClassificationService, MatchingService]
                ↓
            Mistral AI API
    [mistral-small-latest, mistral-embed]
```

### Services principaux

1. **EmailExtractionService** (`app/nlp/extraction_service.py`)
   - Extrait les entités importantes des emails
   - Combine règles regex + Mistral AI
   - Retourne : entreprise, poste, contact, dates, mots-clés

2. **EmailClassificationService** (`app/nlp/classification_service.py`)
   - Classifie le type d'email de recrutement
   - Règles FR/EN + fallback Mistral AI
   - Suggère les transitions de statut de candidature

3. **EmailMatchingService** (`app/nlp/matching_service.py`)
   - Rapproche emails et candidatures existantes
   - Matching par règles + similarité sémantique (embeddings)
   - Auto-liaison si confiance élevée

4. **NLPOrchestrator** (`app/nlp/nlp_orchestrator.py`)
   - Orchestre tous les services NLP
   - Actions automatiques (liaison, changement statut)
   - Traçabilité complète

## 🎯 Stratégie coût/performance

### Approche hybride optimisée

1. **Règles simples d'abord** 
   - Regex et mots-clés FR/EN
   - Rapide et gratuit
   - Confiance calculée automatiquement

2. **Mistral AI si nécessaire**
   - Appelé seulement si confiance < seuil
   - `mistral-small-latest` pour extraction/classification
   - `mistral-embed` pour matching sémantique

3. **Escalade intelligente**
   - `mistral-large-latest` pour cas ambigus (optionnel)
   - Évite les appels API inutiles

## 📊 Configuration

### Variables d'environnement

```bash
# API Mistral
MISTRAL_API_KEY=your-api-key
MISTRAL_EXTRACTION_MODEL=mistral-small-latest
MISTRAL_LARGE_MODEL=mistral-large-latest
MISTRAL_EMBED_MODEL=mistral-embed

# Paramètres
MISTRAL_TEMPERATURE=0.1
MISTRAL_MAX_TOKENS=1000
SIMILARITY_THRESHOLD=0.7
CLASSIFICATION_CONFIDENCE_THRESHOLD=0.8
```

### Seuils de confiance

- **Extraction** : > 0.6 → Appel Mistral
- **Classification** : > 0.8 → Pas d'appel Mistral  
- **Matching** : > 0.7 → Candidature considérée
- **Auto-liaison** : > 0.8 → Liaison automatique

## 🚀 Endpoints API

### `/api/v1/nlp/`

- `POST /process` - Traitement NLP complet d'un email
- `POST /extract` - Extraction d'entités uniquement  
- `POST /classify` - Classification d'email uniquement
- `POST /match` - Matching avec candidatures
- `POST /reprocess/{email_id}` - Retraitement d'un email
- `GET /stats` - Statistiques NLP

### Exemple d'utilisation

```bash
# Traitement complet d'un email
curl -X POST "http://localhost:8000/api/v1/nlp/process" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Accusé de réception - Poste Développeur Python", 
    "body": "Nous avons bien reçu votre candidature...",
    "sender_email": "rh@techcorp.com"
  }'
```

## 🔄 Flux de traitement automatique

### Lors de l'import d'un email :

1. **Extraction** → Entités extraites (entreprise, poste, etc.)
2. **Classification** → Type déterminé (ACK, INTERVIEW, etc.)
3. **Matching** → Candidatures correspondantes trouvées
4. **Actions automatiques** :
   - Liaison email ↔ candidature si confiance > 0.8
   - Changement de statut si approprié
   - Création de candidature si email ACK détecté
   - Planification de rappels

### Traçabilité

Tous les traitements sont tracés dans `application_events` :
- Emails reçus et classifiés
- Changements de statut automatiques
- Scores de confiance et méthodes utilisées

## 📈 Types de classification

| Type | Description | Action automatique |
|------|-------------|-------------------|
| `ACK` | Accusé de réception | → Status `ACKNOWLEDGED` |
| `REJECTED` | Refus de candidature | → Status `REJECTED` |
| `INTERVIEW` | Convocation entretien | → Status `INTERVIEW` |
| `OFFER` | Offre d'emploi | → Status `OFFER` |
| `REQUEST` | Demande documents | → Status `SCREENING` |
| `OTHER` | Autre type | Aucune action |

## 🎨 Règles de classification (exemples)

### Français
- **ACK** : "accusé de réception", "avons bien reçu"
- **REJECTED** : "ne donnerons pas suite", "candidature non retenue"
- **INTERVIEW** : "entretien", "convocation", "disponibilité"
- **OFFER** : "offre", "proposition d'embauche", "félicitations"

### Anglais  
- **ACK** : "received your application", "thank you for applying"
- **REJECTED** : "unfortunately", "not selected", "other candidates"
- **INTERVIEW** : "interview", "meeting", "schedule", "availability"
- **OFFER** : "job offer", "congratulations", "pleased to offer"

## 🔍 Monitoring & Debug

### Logs structurés

```python
logger.info(f"Processing email {email.id} with NLP services")
logger.info(f"Classification: {classification.email_type} (confidence: {classification.confidence})")
logger.info(f"Auto-linked email {email.id} to application {app_id}")
```

### Métriques disponibles

- Taux de classification réussie
- Taux de liaison automatique  
- Répartition par type d'email
- Temps de traitement moyen
- Coût des appels Mistral AI

## 🛠️ Tests et validation

### Tests unitaires
```bash
pytest app/nlp/tests/ -v
```

### Tests d'intégration
```bash  
pytest app/tests/test_nlp_integration.py -v
```

### Validation manuelle
- Interface admin pour revoir les classifications
- Possibilité de reprocesser les emails
- Feedback pour améliorer les règles

## 🚧 Améliorations futures

1. **Fine-tuning** - Modèle spécialisé sur vos données
2. **Règles avancées** - YAML configurable par domaine
3. **Multi-langue** - Support DE, ES, IT
4. **Analyse de sentiment** - Détection de l'urgence/priorité
5. **OCR** - Extraction depuis pièces jointes PDF
