#!/bin/bash
set -e

echo "🚀 Initialisation du projet AI Recruit Tracker"

# Vérifier que Docker et Docker Compose sont installés
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Aller dans le répertoire infra
cd "$(dirname "$0")/../infra"

echo "📦 Construction des images Docker..."
docker-compose build

echo "🗄️  Démarrage de la base de données..."
docker-compose up -d db

echo "⏳ Attente que la base de données soit prête..."
sleep 10

echo "🔄 Exécution des migrations Alembic..."
docker-compose exec -T db psql -U airtrack -d airtrackdb -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

echo "🌐 Démarrage de tous les services..."
docker-compose up -d

echo "✅ Projet initialisé avec succès!"
echo ""
echo "🌍 Services disponibles:"
echo "  - Frontend: http://localhost:4200"
echo "  - Backend API: http://localhost:8000"
echo "  - Base de données: localhost:5432"
echo ""
echo "📚 Documentation API: http://localhost:8000/docs"
echo ""
echo "🛑 Pour arrêter les services: docker-compose down"
