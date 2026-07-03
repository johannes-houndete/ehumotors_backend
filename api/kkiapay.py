import hmac
import hashlib
import requests
from django.conf import settings

KKIAPAY_BASE_URL = getattr(settings, "KKIAPAY_BASE_URL", "https://api-sandbox.kkiapay.me")
KKIAPAY_API_KEY  = getattr(settings, "KKIAPAY_API_KEY", "")
KKIAPAY_WEBHOOK_SECRET = getattr(settings, "KKIAPAY_WEBHOOK_SECRET", "")


def initier_paiement(montant: float, numero_momo: str, reason: str = "Recharge EhuMotors") -> dict:
    """
    Initie un paiement Mobile Money via KKiaPay.
    Utilise la simulation si KKIAPAY_API_KEY n'est pas configuré.
    """
    if not KKIAPAY_API_KEY:
        # Mode Simulation (Placeholder)
        return {
            "success": True,
            "transaction_id": "PLACEHOLDER_TXN_001",
            "message": "Paiement simulé (clé KKiaPay non configurée)",
        }

    # Appel réel à l'API KKiaPay (Sandbox ou Prod selon KKIAPAY_BASE_URL)
    headers = {
        "x-api-key": KKIAPAY_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "amount": int(montant),
        "phone": numero_momo,
        "reason": reason,
    }
    
    try:
        resp = requests.post(
            f"{KKIAPAY_BASE_URL}/v1/payments/request",
            json=payload,
            headers=headers,
            timeout=15,
        )
        
        # Gérer les cas où le serveur ne renvoie pas de JSON ou un code d'erreur
        if resp.status_code != 200:
            try:
                err_msg = resp.json().get("message", f"Erreur {resp.status_code}")
            except Exception:
                err_msg = resp.text or f"Code HTTP {resp.status_code}"
            return {
                "success": False,
                "transaction_id": None,
                "message": f"Refus KKiaPay: {err_msg}",
            }
            
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
    except requests.RequestException as e:
        return {
            "success": False,
            "transaction_id": None,
            "message": f"Erreur réseau de communication avec KKiaPay : {str(e)}",
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
