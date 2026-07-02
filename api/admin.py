from django.contrib import admin
from .models import Clients, Motos, Stations, Utilisateurs, Sessions, Paiements, Tarifs


@admin.register(Clients)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['id', 'nom', 'telephone', 'email', 'created_at']
    search_fields = ['nom', 'email', 'telephone']
    ordering = ['nom']


@admin.register(Motos)
class MotoAdmin(admin.ModelAdmin):
    list_display = ['id', 'num_chassis', 'modele', 'client']
    search_fields = ['num_chassis', 'modele', 'client__nom']
    list_select_related = ['client']


@admin.register(Stations)
class StationAdmin(admin.ModelAdmin):
    list_display = ['id', 'nom', 'adresse', 'capacite_wh', 'created_at']
    search_fields = ['nom', 'adresse']


@admin.register(Utilisateurs)
class UtilisateurAdmin(admin.ModelAdmin):
    list_display = ['id', 'nom', 'email', 'role', 'station', 'actif']
    list_filter = ['role', 'actif']
    search_fields = ['nom', 'email']
    list_select_related = ['station']
    # Exclure mot_de_passe de l'affichage — hashé avec bcrypt
    exclude = ['mot_de_passe']


@admin.register(Tarifs)
class TarifAdmin(admin.ModelAdmin):
    list_display = ['id', 'regle', 'prix_par_wh', 'admin', 'date_modif']
    list_select_related = ['admin']
    ordering = ['-date_modif']


@admin.register(Sessions)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'date_heure', 'moto', 'station', 'agent', 'pct_depart', 'pct_cible', 'energie_wh', 'cout_fcfa', 'statut']
    list_filter = ['statut', 'station']
    search_fields = ['moto__num_chassis', 'agent__nom']
    list_select_related = ['moto', 'station', 'agent']
    ordering = ['-date_heure']
    readonly_fields = ['energie_wh', 'cout_fcfa']


@admin.register(Paiements)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'montant', 'numero_momo', 'transaction_id', 'statut', 'date_heure']
    list_filter = ['statut']
    search_fields = ['transaction_id', 'numero_momo']
    ordering = ['-date_heure']
    readonly_fields = ['transaction_id', 'statut']
