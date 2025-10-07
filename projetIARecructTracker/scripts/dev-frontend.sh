#!/bin/bash

# Script de développement pour le frontend Angular
# Usage: ./dev-frontend.sh

echo "🚀 Démarrage du frontend AI Recruit Tracker en mode développement"
echo "==============================================================="

# Se positionner dans le bon répertoire
cd "$(dirname "$0")/../frontend/frontend"

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    npm install
fi

# Démarrer le serveur de développement
echo "🌟 Démarrage du serveur Angular sur http://localhost:4200"
echo "💡 Le backend doit être démarré séparément sur http://localhost:8000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

npm start
