#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

# Activer l'environnement virtuel
if [ -d "$DIR/backend/venv" ]; then
  source "$DIR/backend/venv/bin/activate"
elif [ -d "$DIR/venv" ]; then
  source "$DIR/venv/bin/activate"
else
  echo "⚠ Virtualenv non trouvé."
  echo "Créez-le : python3 -m venv backend/venv && source backend/venv/bin/activate"
  echo "Puis : pip install -r requirements.txt"
  exit 1
fi

cd "$DIR"
exec python manage.py runserver 0.0.0.0:8000
