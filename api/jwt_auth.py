"""
Backend d'authentification JWT personnalisé pour EHU Motors.

SimpleJWT tente par défaut de résoudre l'utilisateur via django.contrib.auth.User.
Comme EHU Motors utilise sa propre table `utilisateurs` (managed=False + bcrypt),
on surcharge JWTAuthentication pour retourner notre objet Utilisateurs directement
depuis le payload du token, sans accès base de données supplémentaire.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Utilisateurs


class EhuJWTAuthentication(JWTAuthentication):
    """
    Authentification JWT qui retourne un faux objet "user" construit
    depuis le payload du token, sans toucher à auth.User de Django.
    """

    def get_user(self, validated_token):
        """
        Au lieu de chercher l'utilisateur dans auth_user,
        on construit un objet Utilisateurs depuis le payload JWT.
        """
        user_id = validated_token.get("user_id")
        if not user_id:
            raise InvalidToken("Token sans user_id")

        try:
            user = Utilisateurs.objects.get(pk=user_id, actif=1)
        except Utilisateurs.DoesNotExist:
            raise InvalidToken("Utilisateur introuvable ou inactif")

        # Attacher le token validé sur l'objet user pour que request.auth fonctionne
        user._validated_token = validated_token
        return user

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result

        # request.auth doit être le payload dict pour nos permissions RBAC
        # On retourne le token validé directement (déjà fait par le parent)
        return user, validated_token
