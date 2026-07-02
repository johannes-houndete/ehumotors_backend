"""
Module d'intégration KKiaPay — EHU Motors

TODO: Renseigner KKIAPAY_API_KEY dans core/settings.py quand tu auras la clé.
En attendant, les appels retournent des réponses simulées (mode PLACEHOLDER).
"""

import requests
from django.conf import settings

KKIAPAY_BASE_URL = getattr(settings, "KKIAPAY_BASE_URL", "https://api-sandbox.kkiapay.me")
KKIAPAY_API_KEY  = getattr(settings, "KKIAPAY_API_KEY", "")


def initier_paiement(montant: float, numero_momo: str, reason: str = "Recharge EhuMotors") -> dict:
    """
    Initie un paiement Mobile Money via KKiaPay.

    Retourne un dict avec :
        - success (bool)
        - transaction_id (str|None)
        - message (str)

    TODO: Décommenter le bloc requests et supprimer le bloc PLACEHOLDER
          quand KKIAPAY_API_KEY sera disponible.
    """

    # ── PLACEHOLDER ───────────────────────────────────────────────────────────
    # Simule une réponse KKiaPay en attendant la vraie clé API.
    # Supprimer ce bloc et décommenter la section ci-dessous en production.
    if not KKIAPAY_API_KEY:
        return {
            "success": True,
            "transaction_id": "PLACEHOLDER_TXN_001",
            "message": "Paiement simulé (clé KKiaPay non configurée)",
        }
    # ── FIN PLACEHOLDER ───────────────────────────────────────────────────────

    # ── INTÉGRATION RÉELLE ────────────────────────────────────────────────────
    # Décommenter quand KKIAPAY_API_KEY est disponible.
    #
    # headers = {
    #     "x-api-key": KKIAPAY_API_KEY,
    #     "Content-Type": "application/json",
    # }
    # payload = {
    #     "amount": int(montant),
    #     "phone": numero_momo,
    #     "reason": reason,
    # }
    # try:
    #     resp = requests.post(
    #         f"{KKIAPAY_BASE_URL}/v1/payments/request",
    #         json=payload,
    #         headers=headers,
    #         timeout=15,
    #     )
    #     data = resp.json()
    #     if resp.status_code == 200 and data.get("requestId"):
    #         return {
    #             "success": True,
    #             "transaction_id": data["requestId"],
    #             "message": "Paiement initié avec succès",
    #         }
    #     return {
    #         "success": False,
    #         "transaction_id": None,
    #         "message": data.get("message", "Erreur KKiaPay"),
    #     }
    # except requests.RequestException as e:
    #     return {
    #         "success": False,
    #         "transaction_id": None,
    #         "message": f"Erreur réseau KKiaPay : {str(e)}",
    #     }
    # ── FIN INTÉGRATION RÉELLE ────────────────────────────────────────────────


def verifier_webhook_signature(request_body: bytes, signature: str) -> bool:
    """
    Vérifie la signature HMAC du webhook KKiaPay.

    TODO: Implémenter la vérification avec KKIAPAY_WEBHOOK_SECRET quand disponible.
    """
    # PLACEHOLDER — accepte tout en développement
    return True
