from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers
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

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomTokenObtainSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
