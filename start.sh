#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  EhuMotors — Script de démarrage Docker
# ═══════════════════════════════════════════════════════════

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${BLUE}⚡ EhuMotors — Démarrage des services...${RESET}"
echo ""

# Démarrer Docker daemon si nécessaire (WSL)
if ! sudo service docker status > /dev/null 2>&1; then
    echo -e "${YELLOW}▶ Démarrage du daemon Docker...${RESET}"
    sudo service docker start
    sleep 2
fi

# Lancer les conteneurs
sudo docker compose up -d "$@"
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠ Erreur au démarrage. Vérifiez les logs : sudo docker compose logs${RESET}"
    exit $EXIT_CODE
fi

# Attendre que les services soient healthy
echo ""
echo -e "${BOLD}⏳ Attente que les services soient prêts...${RESET}"
sleep 3

# Affichage des URLs
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║         ✅ EhuMotors est démarré !                  ║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                      ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  ${CYAN}🌐 Frontend (Agent)${RESET}                               ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}     → ${BOLD}http://localhost:3000${RESET}                         ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                      ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  ${CYAN}⚙️  Backend API (Django)${RESET}                           ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}     → ${BOLD}http://localhost:8000/api/${RESET}                    ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}     → ${BOLD}http://localhost:8000/admin/${RESET}  (Django Admin)   ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                      ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  ${CYAN}🗄️  Base de données MySQL${RESET}                          ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}     → Interne Docker (non exposé)                    ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}                                                      ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}╠══════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}  ${YELLOW}📋 Commandes utiles :${RESET}                              ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}     sudo docker compose logs -f     (voir les logs)  ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}     sudo docker compose down        (arrêter)        ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}║${RESET}     sudo docker compose ps          (état)           ${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
