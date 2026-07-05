#!/usr/bin/env bash
set -euo pipefail

echo "=== Configuration de la base de données ==="
echo "Ce script va configurer MySQL pour le projet EhuMotors."
echo "Le mot de passe root MySQL vous sera demandé (si configuré)."
echo ""

# Essayer d'initialiser la base de données et l'utilisateur
if command -v mysql &>/dev/null; then
  echo "Tentative de connexion à MySQL..."
  if sudo mysql -e "SELECT 1;" &>/dev/null; then
    echo "Connexion réussie via sudo. Création de la base de données..."
    sudo mysql < backend/setup_db.sql
    echo "Base de données et utilisateur créés."
  elif mysql -u root -p < backend/setup_db.sql 2>/dev/null; then
    echo "Base de données et utilisateur créés."
  else
    echo "⚠ Impossible de se connecter à MySQL automatiquement."
    echo "Veuillez exécuter manuellement :"
    echo "  sudo mysql < backend/setup_db.sql"
    echo "ou :"
    echo "  mysql -u root -p < backend/setup_db.sql"
    echo ""
    echo "Ensuite, exécutez les migrations :"
    echo "  source backend/venv/bin/activate && python backend/manage.py migrate"
  fi
fi

echo ""
echo "=== Migrations Django ==="
if [ -d backend/venv ]; then
  source backend/venv/bin/activate
  python backend/manage.py migrate
else
  echo "⚠ Virtualenv non trouvé. Créez-le puis installez les dépendances :"
  echo "  python3 -m venv backend/venv"
  echo "  source backend/venv/bin/activate"
  echo "  pip install -r requirements.txt"
  echo "  python backend/manage.py migrate"
fi

echo ""
echo "=== Frontend ==="
NODE_DIR="node-v22.12.0-linux-x64"
if [ -d "$NODE_DIR" ]; then
  echo "Node.js v22 trouvé dans $NODE_DIR"
  echo "Utilisez la commande suivante pour lancer le frontend :"
  echo "  export PATH=\"\$PWD/$NODE_DIR/bin:\$PATH\""
  echo "  cd frontend && npm run dev"
else
  echo "⚠ Node.js v22 non trouvé. Téléchargez-le depuis https://nodejs.org/"
fi

echo ""
echo "=== Résumé ==="
echo "Backend :  source backend/venv/bin/activate && python backend/manage.py runserver 0.0.0.0:8000"
echo "Frontend : export PATH=\"\$PWD/$NODE_DIR/bin:\$PATH\" && cd frontend && npm run dev"
echo "Docker :   docker compose up -d --build"
