import hmac
import hashlib
import requests
from django.conf import settings


KKIAPAY_PUBLIC_KEY  = getattr(settings, "KKIAPAY_PUBLIC_KEY", "")
KKIAPAY_PRIVATE_KEY = getattr(settings, "KKIAPAY_PRIVATE_KEY", "")
KKIAPAY_SECRET_KEY  = getattr(settings, "KKIAPAY_SECRET_KEY", "")
KKIAPAY_BASE_URL    = getattr(settings, "KKIAPAY_BASE_URL", "https://api-sandbox.kkiapay.me")
KKIAPAY_WEBHOOK_SECRET = getattr(settings, "KKIAPAY_WEBHOOK_SECRET", "")


class KkiapayError(Exception):
    pass


def verifier_transaction(transaction_id: str) -> dict:
    """
    Vérifie le statut d'une transaction KKiaPay via /api/v1/transactions/status.

    KKiaPay n'expose aucune API pour initier un paiement Mobile Money depuis le
    serveur : le paiement est initié côté client par le widget JS (kkiapay-widget),
    qui renvoie un transactionId une fois le paiement complété par l'utilisateur.
    Le serveur doit ensuite vérifier ce transactionId ici avant de considérer la
    session comme payée — ne jamais faire confiance à un "succès" annoncé par le
    front sans cette vérification.
    """
    if not (KKIAPAY_PUBLIC_KEY and KKIAPAY_PRIVATE_KEY and KKIAPAY_SECRET_KEY):
        raise KkiapayError(
            "Clés KKiaPay incomplètes : KKIAPAY_PUBLIC_KEY, KKIAPAY_PRIVATE_KEY et "
            "KKIAPAY_SECRET_KEY sont toutes requises pour vérifier une transaction."
        )

    headers = {
        "Accept": "application/json",
        "X-API-KEY": KKIAPAY_PUBLIC_KEY,
        "X-PRIVATE-KEY": KKIAPAY_PRIVATE_KEY,
        "X-SECRET-KEY": KKIAPAY_SECRET_KEY,
    }

    try:
        resp = requests.post(
            f"{KKIAPAY_BASE_URL}/api/v1/transactions/status",
            json={"transactionId": transaction_id},
            headers=headers,
            timeout=15,
        )
    except requests.RequestException as e:
        raise KkiapayError(f"API KKiaPay injoignable ({e})") from e

    if resp.status_code != 200:
        raise KkiapayError(f"KKiaPay a répondu {resp.status_code}: {resp.text[:200]}")

    return resp.json()


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
