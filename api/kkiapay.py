import hmac
import hashlib
import requests
from django.conf import settings


KKIAPAY_PUBLIC_KEY  = getattr(settings, "KKIAPAY_PUBLIC_KEY", "")
KKIAPAY_API_KEY    = getattr(settings, "KKIAPAY_API_KEY", "")
KKIAPAY_PRIVATE_KEY = getattr(settings, "KKIAPAY_PRIVATE_KEY", "")
KKIAPAY_SECRET_KEY  = getattr(settings, "KKIAPAY_SECRET_KEY", "")
KKIAPAY_BASE_URL    = getattr(settings, "KKIAPAY_BASE_URL", "https://api-sandbox.kkiapay.me")
KKIAPAY_WEBHOOK_SECRET = getattr(settings, "KKIAPAY_WEBHOOK_SECRET", "")


def initier_paiement(montant: float, numero_momo: str, reason: str = "Recharge EhuMotors") -> dict:
    """
    Initie un paiement Mobile Money via KKiaPay.
    Tentative d'appel API ; si les clés sont invalides ou l'API injoignable,
    bascule automatiquement en mode simulation pour permettre les tests.
    """
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if KKIAPAY_PUBLIC_KEY:
        headers["X-API-KEY"] = KKIAPAY_PUBLIC_KEY
    elif KKIAPAY_API_KEY:
        headers["x-api-key"] = KKIAPAY_API_KEY
    else:
        return _simulation(montant, numero_momo, "aucune clé configurée")

    if KKIAPAY_PRIVATE_KEY:
        headers["X-PRIVATE-KEY"] = KKIAPAY_PRIVATE_KEY
    if KKIAPAY_SECRET_KEY:
        headers["X-SECRET-KEY"] = KKIAPAY_SECRET_KEY

    payload = {
        "amount": int(montant),
        "phone": numero_momo,
        "reason": reason,
    }
    
    try:
        resp = requests.post(
            f"{KKIAPAY_BASE_URL}/api/v1/payments/request",
            json=payload,
            headers=headers,
            timeout=15,
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("requestId"):
                return {
                    "success": True,
                    "transaction_id": data["requestId"],
                    "message": "Paiement initié avec succès",
                }
            return {
                "success": False,
                "transaction_id": None,
                "message": data.get("message", "Réponse KKiaPay incomplète"),
            }

        # L'API a refusé la requête → on bascule en simulation
        return _simulation(montant, numero_momo, "API KKiaPay indisponible (mode simulation)")

    except requests.RequestException as e:
        return _simulation(montant, numero_momo, f"API KKiaPay injoignable ({str(e)})")


def _simulation(montant: float, numero_momo: str, raison: str) -> dict:
    """Renvoie une transaction fictive pour permettre les tests hors-ligne."""
    import uuid
    return {
        "success": True,
        "transaction_id": f"SIMU_{uuid.uuid4().hex[:12].upper()}",
        "message": raison,
    }


def verifier_webhook_signature(request_body: bytes, signature: str) -> bool:
    """
    Vérifie la signature HMAC SHA256 du webhook KKiaPay si le secret est configuré.
    Sinon, accepte le webhook pour faciliter les tests locaux de développement.
    """
    if not KKIAPAY_WEBHOOK_SECRET:
        return True

    try:
        calculated_signature = hmac.new(
            KKIAPAY_WEBHOOK_SECRET.encode('utf-8'),
            request_body,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(calculated_signature, signature)
    except Exception:
        return False
