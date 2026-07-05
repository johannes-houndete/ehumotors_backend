from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Utilisateurs
import bcrypt


class CustomTokenObtainSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        try:
            user = Utilisateurs.objects.get(email=email, actif=1)
        except Utilisateurs.DoesNotExist:
            raise serializers.ValidationError("Identifiants invalides")

        # Vérifier le mot de passe bcrypt
        if not bcrypt.checkpw(password.encode('utf-8'), user.mot_de_passe.encode('utf-8')):
            raise serializers.ValidationError("Identifiants invalides")

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken()
        refresh['user_id'] = user.id
        refresh['email'] = user.email
        refresh['role'] = user.role
        refresh['nom'] = user.nom
        refresh['station_id'] = user.station_id  # None pour les admins

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'nom': user.nom,
                'email': user.email,
                'role': user.role,
                'station_id': user.station_id,
            }
        }


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomTokenObtainSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class EhuTokenRefreshView(APIView):
    """
    Vue de refresh token personnalisée qui évite la recherche dans auth.User.
    SimpleJWT tente par défaut de valider le user_id via django.contrib.auth.User,
    ce qui lève un 500 car on utilise la table `utilisateurs`.
    Ici on décode le refresh token et on génère un nouveau access token directement.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token requis.'}, status=400)

        try:
            token = RefreshToken(refresh_token)

            # Vérifier que l'utilisateur est toujours actif en DB
            user_id = token.get('user_id')
            try:
                Utilisateurs.objects.get(pk=user_id, actif=1)
            except Utilisateurs.DoesNotExist:
                return Response({'error': 'Utilisateur introuvable ou inactif.'}, status=401)

            return Response({'access': str(token.access_token)})

        except TokenError as e:
            return Response({'error': str(e)}, status=401)
