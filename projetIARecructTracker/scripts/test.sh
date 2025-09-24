#!/bin/bash
set -e

echo "🧪 Exécution des tests..."

# Tests backend
echo "🐍 Tests backend (Python)..."
cd "$(dirname "$0")/../backend"
if [ -f requirements-dev.txt ]; then
    pip install -r requirements-dev.txt
fi
pytest tests/ -v --cov=app --cov-report=html

# Tests frontend
echo "🅰️ Tests frontend (Angular)..."
cd "$(dirname "$0")/../frontend"
if [ -f package.json ]; then
    npm install
    npm run test -- --watch=false --browsers=ChromeHeadless
fi

echo "✅ Tous les tests terminés!"
