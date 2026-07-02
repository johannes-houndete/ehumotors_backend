import csv
from datetime import datetime, timedelta

from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Clients, Motos, Stations, Utilisateurs, Sessions, Paiements, Tarifs
from .serializers import (
    ClientSerializer, StationSerializer, SessionSerializer,
    PaiementSerializer, TarifSerializer,
    UtilisateurSerializer, UtilisateurCreateSerializer,
)
from .permissions import IsAdmin, IsAdminOrAgent
from .kkiapay import initier_paiement, verifier_webhook_signature


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_user_from_token(request):
    """Retourne (user_id, role, station_id) depuis le payload JWT."""
    auth = request.auth
    return (
        auth.get("user_id"),
        auth.get("role"),
        auth.get("station_id"),   # None pour les admins
    )


class Tier:
    def __init__(self, min_val: int, max_val: int, rate: float):
        self.min = min_val
        self.max = max_val
        self.rate = rate


TIERS = [
    Tier(5, 10, 20.0),
    Tier(10, 20, 15.0),
    Tier(20, 90, 12.0),
    Tier(90, 100, 15.0),
]


def compute_price(start: float, target: float) -> float:
    start = max(0.0, min(100.0, start))
    target = max(0.0, min(100.0, target))

    if target <= start:
        return 0.0

    total = 0.0

    # Pénalité fixe si niveau initial < 5%
    if start < 5.0:
        total += 250.0

    # Calcul par paliers
    for tier in TIERS:
        if tier.max <= start:
            continue

        from_val = start if start > tier.min else float(tier.min)
        to_val = target if target < tier.max else float(tier.max)

        delta = max(0.0, min(100.0, to_val - from_val))

        if delta > 0.0:
            total += delta * tier.rate

    return total


def _calculer_cout(pct_depart: float, pct_cible: float, capacite_wh: float, prix_par_wh: float):
    """
    Calcule l'énergie et le coût d'une session de recharge.
    """
    energie_wh = (pct_cible - pct_depart) / 100 * capacite_wh
    cout_fcfa = compute_price(pct_depart, pct_cible)
    return round(energie_wh, 2), round(cout_fcfa, 2)



# ─────────────────────────────────────────────────────────────────────────────
# Clients
# ─────────────────────────────────────────────────────────────────────────────

class ClientViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Clients.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, IsAdminOrAgent]

    @action(detail=False, methods=['get'], url_path='search')
    def search_by_chassis(self, request):
        chassis = request.query_params.get('chassis')
        if not chassis:
            return Response({'error': 'Numéro de châssis requis'}, status=400)
        try:
            moto = Motos.objects.select_related('client').get(num_chassis=chassis)
            return Response({
                'client_id': moto.client.id,
                'nom': moto.client.nom,
                'email': moto.client.email,
                'telephone': moto.client.telephone,
                'moto_id': moto.id,
                'modele': moto.modele,
                'num_chassis': moto.num_chassis,
            })
        except Motos.DoesNotExist:
            return Response({'error': 'Châssis introuvable'}, status=404)


# ─────────────────────────────────────────────────────────────────────────────
# Stations
# ─────────────────────────────────────────────────────────────────────────────

class StationViewSet(viewsets.ModelViewSet):
    queryset = Stations.objects.all()
    serializer_class = StationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrAgent]

    def get_permissions(self):
        # Création / modification / suppression → admin uniquement
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()


# ─────────────────────────────────────────────────────────────────────────────
# Sessions
# ─────────────────────────────────────────────────────────────────────────────

class SessionViewSet(viewsets.ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated, IsAdminOrAgent]

    def get_queryset(self):
        _, role, station_id = _get_user_from_token(self.request)
        qs = Sessions.objects.select_related('moto', 'agent', 'station', 'tarif')

        if role == 'agent':
            # Un agent ne voit que les sessions de sa propre station
            qs = qs.filter(station_id=station_id)
        else:
            # Admin : filtre optionnel par station
            sid = self.request.query_params.get('station_id')
            if sid:
                qs = qs.filter(station_id=sid)

        # Filtres supplémentaires
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)

        chassis = self.request.query_params.get('chassis')
        if chassis:
            qs = qs.filter(moto__num_chassis__icontains=chassis)

        date_debut = self.request.query_params.get('date_debut')
        date_fin   = self.request.query_params.get('date_fin')
        if date_debut:
            qs = qs.filter(date_heure__date__gte=date_debut)
        if date_fin:
            qs = qs.filter(date_heure__date__lte=date_fin)

        return qs.order_by('-date_heure')

    def perform_create(self, serializer):
        """
        Calcule automatiquement energie_wh et cout_fcfa avant de sauvegarder.
        L'agent est rempli automatiquement depuis le token JWT.
        """
        user_id, role, station_id = _get_user_from_token(self.request)

        data = serializer.validated_data
        pct_depart  = data['pct_depart']
        pct_cible   = data['pct_cible']
        station     = data.get('station') or Stations.objects.get(pk=station_id)
        capacite_wh = station.capacite_wh

        # Récupérer le tarif actif (le plus récent)
        tarif = data.get('tarif') or Tarifs.objects.order_by('-date_modif').first()
        prix_par_wh = tarif.prix_par_wh if tarif else 0

        energie_wh, cout_fcfa = _calculer_cout(pct_depart, pct_cible, capacite_wh, prix_par_wh)

        serializer.save(
            agent_id=user_id,
            energie_wh=energie_wh,
            cout_fcfa=cout_fcfa,
            statut='en_attente',
            date_heure=timezone.now(),
        )

    # ── Action : initier le paiement KKiaPay ──────────────────────────────────
    @action(detail=True, methods=['post'], url_path='paiement',
            permission_classes=[IsAuthenticated, IsAdminOrAgent])
    def initier_paiement_session(self, request, pk=None):
        session = self.get_object()

        if session.statut == 'paye':
            return Response({'error': 'Cette session est déjà payée.'}, status=400)

        numero_momo = request.data.get('numero_momo')
        if not numero_momo:
            return Response({'error': 'Numéro Mobile Money requis.'}, status=400)

        montant = session.cout_fcfa or 0

        # ── Appel KKiaPay (placeholder tant que la clé n'est pas configurée) ──
        result = initier_paiement(
            montant=montant,
            numero_momo=numero_momo,
            reason=f"Recharge EhuMotors session #{session.id}",
        )

        if not result['success']:
            return Response({'error': result['message']}, status=502)

        # Créer ou mettre à jour l'enregistrement paiement
        paiement, _ = Paiements.objects.update_or_create(
            session=session,
            defaults={
                'montant': montant,
                'numero_momo': numero_momo,
                'transaction_id': result['transaction_id'],
                'statut': 'en_cours',
                'date_heure': timezone.now(),
            }
        )

        session.statut = 'en_cours'
        session.save(update_fields=['statut'])

        return Response({
            'message': result['message'],
            'transaction_id': result['transaction_id'],
            'montant': montant,
            'statut': 'en_cours',
        }, status=200)

    # ── Action : export CSV ───────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='export',
            permission_classes=[IsAuthenticated, IsAdminOrAgent])
    def export_csv(self, request):
        qs = self.get_queryset()

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = (
            f'attachment; filename="sessions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        )
        response.write('\ufeff')  # BOM UTF-8 pour Excel

        writer = csv.writer(response, delimiter=';')
        writer.writerow([
            'ID', 'Date/Heure', 'Châssis', 'Modèle Moto',
            'Agent', 'Station', '% Départ', '% Cible',
            'Énergie (Wh)', 'Coût (FCFA)', 'Statut',
        ])

        for s in qs:
            writer.writerow([
                s.id,
                s.date_heure.strftime('%d/%m/%Y %H:%M') if s.date_heure else '',
                s.moto.num_chassis if s.moto else '',
                s.moto.modele if s.moto else '',
                s.agent.nom if s.agent else '',
                s.station.nom if s.station else '',
                s.pct_depart,
                s.pct_cible,
                s.energie_wh,
                s.cout_fcfa,
                s.statut,
            ])

        return response


# ─────────────────────────────────────────────────────────────────────────────
# Paiements
# ─────────────────────────────────────────────────────────────────────────────

class PaiementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaiementSerializer
    permission_classes = [IsAuthenticated, IsAdminOrAgent]

    def get_queryset(self):
        _, role, station_id = _get_user_from_token(self.request)
        qs = Paiements.objects.select_related('session__station')
        if role == 'agent':
            qs = qs.filter(session__station_id=station_id)
        return qs.order_by('-date_heure')


class KKiapayWebhookView(APIView):
    """
    Endpoint public pour recevoir les notifications KKiaPay.
    POST /api/paiements/webhook/

    KKiaPay envoie un POST avec le résultat de la transaction.
    En développement, exposer avec ngrok : ngrok http 8000
    """
    permission_classes = []   # Public — authentifié par signature HMAC

    def post(self, request):
        # Vérification signature (placeholder tant que le secret n'est pas configuré)
        signature = request.headers.get('X-KKiaPay-Signature', '')
        if not verifier_webhook_signature(request.body, signature):
            return Response({'error': 'Signature invalide'}, status=403)

        data           = request.data
        transaction_id = data.get('transactionId') or data.get('requestId')
        event          = data.get('status')  # 'SUCCESS' ou 'FAILED'

        if not transaction_id or not event:
            return Response({'error': 'Données incomplètes'}, status=400)

        try:
            paiement = Paiements.objects.select_related('session').get(
                transaction_id=transaction_id
            )
        except Paiements.DoesNotExist:
            return Response({'error': 'Transaction introuvable'}, status=404)

        if event == 'SUCCESS':
            paiement.statut = 'success'
            paiement.session.statut = 'paye'
        else:
            paiement.statut = 'failed'
            paiement.session.statut = 'echec'

        paiement.save(update_fields=['statut'])
        paiement.session.save(update_fields=['statut'])

        return Response({'message': f'Webhook traité : {event}'}, status=200)


# ─────────────────────────────────────────────────────────────────────────────
# Tarifs
# ─────────────────────────────────────────────────────────────────────────────

class TarifViewSet(viewsets.ModelViewSet):
    queryset = Tarifs.objects.order_by('-date_modif')
    serializer_class = TarifSerializer
    permission_classes = [IsAuthenticated, IsAdminOrAgent]

    def get_permissions(self):
        # Écriture réservée à l'admin
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user_id, _, _ = _get_user_from_token(self.request)
        serializer.save(admin_id=user_id, date_modif=timezone.now())

    def perform_update(self, serializer):
        serializer.save(date_modif=timezone.now())


# ─────────────────────────────────────────────────────────────────────────────
# Utilisateurs (admin uniquement)
# ─────────────────────────────────────────────────────────────────────────────

class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateurs.objects.all().order_by('nom')
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return UtilisateurCreateSerializer
        return UtilisateurSerializer


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Stats (admin uniquement)
# ─────────────────────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        periode = request.query_params.get('periode', 'mois')

        now = timezone.now()
        if periode == 'jour':
            debut = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif periode == 'semaine':
            debut = now - timedelta(days=now.weekday())
            debut = debut.replace(hour=0, minute=0, second=0, microsecond=0)
        else:  # 'mois' par défaut
            debut = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        sessions_qs = Sessions.objects.filter(date_heure__gte=debut)

        agregats = sessions_qs.aggregate(
            total_sessions=Count('id'),
            total_energie_wh=Sum('energie_wh'),
            total_ca_fcfa=Sum('cout_fcfa'),
        )

        sessions_payees   = sessions_qs.filter(statut='paye').count()
        sessions_en_cours = sessions_qs.filter(statut='en_cours').count()
        sessions_echec    = sessions_qs.filter(statut='echec').count()

        # Stats par station
        par_station = (
            sessions_qs
            .values('station__id', 'station__nom')
            .annotate(
                nb_sessions=Count('id'),
                energie_wh=Sum('energie_wh'),
                ca_fcfa=Sum('cout_fcfa'),
            )
            .order_by('-nb_sessions')
        )

        return Response({
            'periode': periode,
            'date_debut': debut.isoformat(),
            'date_fin': now.isoformat(),
            'global': {
                'total_sessions':  agregats['total_sessions'] or 0,
                'sessions_payees': sessions_payees,
                'sessions_en_cours': sessions_en_cours,
                'sessions_echec':  sessions_echec,
                'total_energie_wh': round(agregats['total_energie_wh'] or 0, 2),
                'chiffre_affaires_fcfa': round(agregats['total_ca_fcfa'] or 0, 2),
            },
            'par_station': list(par_station),
        })