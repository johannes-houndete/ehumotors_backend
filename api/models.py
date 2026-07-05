# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Clients(models.Model):
    nom = models.CharField(max_length=120)
    telephone = models.CharField(max_length=30, blank=True, null=True)
    email = models.CharField(max_length=120, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'clients'


class Motos(models.Model):
    client = models.ForeignKey(Clients, models.DO_NOTHING)
    num_chassis = models.CharField(unique=True, max_length=30)
    modele = models.CharField(max_length=60, blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'motos'


class Paiements(models.Model):
    session = models.OneToOneField('Sessions', models.DO_NOTHING)
    montant = models.FloatField()
    numero_momo = models.CharField(max_length=20)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    statut = models.CharField(max_length=7)
    date_heure = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'paiements'


class Sessions(models.Model):
    moto = models.ForeignKey(Motos, models.DO_NOTHING)
    agent = models.ForeignKey('Utilisateurs', models.DO_NOTHING)
    station = models.ForeignKey('Stations', models.DO_NOTHING)
    tarif = models.ForeignKey('Tarifs', models.DO_NOTHING, blank=True, null=True)
    pct_depart = models.FloatField()
    pct_cible = models.FloatField()
    energie_wh = models.FloatField(blank=True, null=True)
    cout_fcfa = models.FloatField(blank=True, null=True)
    statut = models.CharField(max_length=15)
    date_heure = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'sessions'


class Stations(models.Model):
    nom = models.CharField(max_length=100)
    adresse = models.CharField(max_length=200, blank=True, null=True)
    capacite_wh = models.FloatField()
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'stations'


class Tarifs(models.Model):
    regle = models.TextField()
    prix_par_wh = models.FloatField()
    admin = models.ForeignKey('Utilisateurs', models.DO_NOTHING)
    date_modif = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'tarifs'


class Utilisateurs(models.Model):
    nom = models.CharField(max_length=120)
    email = models.CharField(unique=True, max_length=120)
    mot_de_passe = models.CharField(max_length=255)
    role = models.CharField(max_length=5)
    station = models.ForeignKey(Stations, models.DO_NOTHING, blank=True, null=True)
    actif = models.IntegerField()
    created_at = models.DateTimeField(blank=True, null=True)

    # Propriétés requises par DRF (IsAuthenticated) et SimpleJWT
    # Sans hériter de AbstractUser pour rester compatible avec la DB existante
    @property
    def is_authenticated(self):
        return bool(self.actif)

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return bool(self.actif)

    class Meta:
        managed = True
        db_table = 'utilisateurs'
