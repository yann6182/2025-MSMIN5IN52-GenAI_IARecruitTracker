#!/bin/bash
set -e

echo "🗄️ Initialisation de la base de données..."

cd "$(dirname "$0")/../backend"

echo "📥 Installation des dépendances Python..."
pip install -r requirements.txt

echo "🔄 Initialisation d'Alembic..."
alembic init alembic

echo "📝 Génération de la première migration..."
alembic revision --autogenerate -m "Initial migration"

echo "⬆️ Application des migrations..."
alembic upgrade head

echo "✅ Base de données initialisée avec succès!"
