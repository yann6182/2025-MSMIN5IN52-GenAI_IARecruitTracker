# 🎨 Frontend AI Recruit Tracker

Interface utilisateur moderne développée avec Angular 17+ et composants standalone.

## 🚀 Démarrage rapide

### Développement
```bash
# Depuis la racine du projet
./scripts/dev-frontend.sh

# Ou manuellement
cd frontend/frontend
npm install
npm start
```

Le frontend sera disponible sur http://localhost:4200

### Production (Docker)
```bash
# Depuis infra/
docker-compose up -d frontend
```

## 🏗️ Architecture

### Structure
```
frontend/frontend/
├── src/
│   ├── app/
│   │   ├── components/          # Composants UI
│   │   │   ├── dashboard/       # Dashboard principal
│   │   │   ├── job-applications/ # Gestion candidatures
│   │   │   ├── companies/       # Gestion entreprises
│   │   │   ├── emails/          # Gestion emails
│   │   │   └── nlp/             # Interface IA/NLP
│   │   ├── models/              # Types TypeScript
│   │   ├── services/            # Services HTTP
│   │   ├── app.routes.ts        # Routes principales
│   │   └── app.config.ts        # Configuration
│   ├── environments/           # Configuration environnement
│   └── styles.scss            # Styles globaux
```

### Composants principaux

- **DashboardComponent** : Vue d'ensemble avec statistiques
- **JobApplicationsListComponent** : Liste des candidatures avec filtres
- **NlpDashboardComponent** : Interface de test IA en temps réel
- **Composants placeholder** : Structures prêtes pour développement

## 🔌 Connexion Backend

### Configuration
Les services Angular se connectent automatiquement au backend via :
- **Development** : `http://localhost:8000/api/v1`
- **Production** : `https://api.ai-recruit-tracker.com/api/v1`

### Services disponibles
- `CompanyService` : Gestion entreprises
- `JobOfferService` : Gestion offres d'emploi  
- `JobApplicationService` : Gestion candidatures
- `EmailService` : Gestion emails + NLP
- `ApplicationEventService` : Événements et historique

## 🎯 Fonctionnalités implémentées

### ✅ Opérationnel
- Navigation responsive avec menu principal
- Dashboard avec statistiques en temps réel
- Liste des candidatures avec filtres
- Interface de test NLP avec Mistral AI
- Styles modernes et animations
- Configuration multi-environnement

### 🔄 En développement
- Formulaires de création/édition
- Détails des candidatures avec timeline
- Gestion complète des entreprises
- Interface de traitement des emails
- Tableaux de bord analytiques

## 🎨 Design System

### Couleurs principales
- **Primary** : `#667eea` (violet-bleu)
- **Success** : `#10b981` (vert)
- **Warning** : `#f59e0b` (orange) 
- **Error** : `#ef4444` (rouge)
- **Background** : `#f8fafc` (gris très clair)

### Composants UI
- Cards avec ombres et hover effects
- Boutons avec animations
- Badges colorés pour les statuts
- Grid responsive
- Loading states avec spinners

## 🧪 Test de l'interface NLP

Le composant `NlpDashboardComponent` permet de tester en temps réel :

1. **Saisie d'email** : Sujet, corps, expéditeur
2. **Analyse IA automatique** :
   - Classification du type d'email
   - Extraction d'entités (entreprise, poste, contact)
   - Matching avec candidatures existantes
3. **Résultats visuels** avec scores de confiance

### Exemple de test
```
Sujet: "Accusé de réception - Poste Développeur Python"
Corps: "Nous avons bien reçu votre candidature..."
Expéditeur: "rh@techcorp.com"

→ Classification: ACK (95% confiance)
→ Entités: TechCorp, Développeur Python, RH
→ Matching: Recherche candidatures correspondantes
```

## 📱 Responsive Design

L'interface s'adapte automatiquement :
- **Desktop** : Navigation horizontale, grids multi-colonnes
- **Tablet** : Navigation adaptée, grids 2 colonnes
- **Mobile** : Navigation verticale, grids 1 colonne, menus condensés

## 🔧 Personnalisation

### Thème
Modifiez `src/app/app.scss` pour personnaliser :
- Couleurs du header
- Effets de hover
- Animations et transitions

### Environnements
Configurez `src/environments/environment.ts` :
- URL de l'API backend
- Features flags
- Timeout des requêtes
- Niveaux de logging

## 🚧 Roadmap Frontend

### Phase 1 (Actuelle)
- ✅ Structure et navigation
- ✅ Dashboard principal  
- ✅ Interface NLP de test
- ✅ Liste des candidatures

### Phase 2
- 🔄 Formulaires CRUD complets
- 🔄 Timeline des événements
- 🔄 Gestion des fichiers (CV, lettres)
- 🔄 Notifications en temps réel

### Phase 3  
- 🔄 Graphiques et analytics
- 🔄 Intégration email (IMAP/Gmail)
- 🔄 Exports PDF/Excel
- 🔄 Mode sombre/clair

## 🐛 Debug

### Problèmes courants
```bash
# Erreurs de compilation TypeScript
npm run build

# Problèmes de dépendances
rm -rf node_modules package-lock.json
npm install

# CORS errors avec le backend
# Vérifier l'URL dans environment.ts
```

### Logs de développement
Les services loggent automatiquement :
- Appels API en cours
- Erreurs de connexion
- Réponses du backend
- États des composants

---

✨ **Interface moderne connectée à l'IA pour un suivi intelligent des candidatures !**
