from rest_framework import serializers
from .models import Clients, Motos, Stations, Utilisateurs, Sessions, Paiements, Tarifs
import bcrypt


class MotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motos
        fields = '__all__'


class ClientSerializer(serializers.ModelSerializer):
    motos = MotoSerializer(many=True, read_only=True, source='motos_set')

    class Meta:
        model = Clients
        fields = ['id', 'nom', 'telephone', 'email', 'created_at', 'motos']


class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stations
        fields = '__all__'


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateurs
        fields = ['id', 'nom', 'email', 'role', 'station', 'actif', 'created_at']
        read_only_fields = ['created_at']


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    """
    Utilisé uniquement pour la création/mise à jour d'un utilisateur.
    Hash automatiquement le mot de passe avec bcrypt.
    """
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Utilisateurs
        fields = ['id', 'nom', 'email', 'role', 'station', 'actif', 'password']

    def create(self, validated_data):
        from django.utils import timezone
        password = validated_data.pop('password')
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
        validated_data['mot_de_passe'] = hashed.decode('utf-8')
        # Defaults
        validated_data.setdefault('actif', 1)
        validated_data.setdefault('role', 'agent')
        validated_data.setdefault('created_at', timezone.now())
        return Utilisateurs.objects.create(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
            instance.mot_de_passe = hashed.decode('utf-8')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance



class TarifSerializer(serializers.ModelSerializer):
    admin_nom = serializers.CharField(source='admin.nom', read_only=True)

    class Meta:
        model = Tarifs
        fields = '__all__'
        read_only_fields = ['admin', 'date_modif']


class SessionSerializer(serializers.ModelSerializer):
    moto_chassis = serializers.CharField(source='moto.num_chassis', read_only=True)
    client_nom = serializers.CharField(source='moto.client.nom', read_only=True)

    class Meta:
        model = Sessions
        fields = [
            'id', 'moto', 'agent', 'station', 'tarif',
            'pct_depart', 'pct_cible', 'energie_wh', 'cout_fcfa',
            'statut', 'date_heure', 'moto_chassis', 'client_nom',
        ]
        read_only_fields = ['energie_wh', 'cout_fcfa', 'statut', 'date_heure', 'agent', 'station', 'tarif']


class PaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiements
        fields = '__all__'
        read_only_fields = ['transaction_id', 'statut', 'date_heure']