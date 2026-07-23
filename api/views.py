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
from .kkiapay import verifier_transaction, verifier_webhook_signature, KkiapayError
from django.conf import settings


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


import json

class Tier:
    def __init__(self, min_val: int, max_val: int, rate: float):
        self.min = min_val
        self.max = max_val
        self.rate = rate


def get_current_pricing():
    try:
        current_tarif = Tarifs.objects.order_by('-date_modif').first()
        if current_tarif and current_tarif.regle:
            config = json.loads(current_tarif.regle)
            if isinstance(config, dict) and "tiers" in config:
                tiers = []
                for t in config["tiers"]:
                    tiers.append(Tier(int(t["min"]), int(t["max"]), float(t["rate"])))
                penalty_threshold = float(config.get("penalty_threshold", 5.0))
                penalty_value = float(config.get("penalty_value", 250.0))
                return tiers, penalty_threshold, penalty_value
    except Exception as e:
        print("Failed to load custom pricing, falling back to default:", e)
    
    # Fallback to default hardcoded tiers
    default_tiers = [
        Tier(5, 10, 20.0),
        Tier(10, 20, 15.0),
        Tier(20, 90, 12.0),
        Tier(90, 100, 15.0),
    ]
    return default_tiers, 5.0, 250.0


def compute_price(start: float, target: float) -> float:
    start = max(0.0, min(100.0, start))
    target = max(0.0, min(100.0, target))

    if target <= start:
        return 0.0

    tiers, penalty_threshold, penalty_value = get_current_pricing()
    total = 0.0

    # Pénalité fixe si niveau initial < penalty_threshold
    if start < penalty_threshold:
        total += penalty_value

    # Calcul par paliers
    for tier in tiers:
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
            station=station,
            energie_wh=energie_wh,
            cout_fcfa=cout_fcfa,
            statut='en_attente',
            date_heure=timezone.now(),
        )

    # ── Action : vérifier un paiement KKiaPay initié côté client ──────────────
    # KKiaPay ne fournit pas d'API pour initier un paiement Mobile Money depuis
    # le serveur : le paiement est fait dans le navigateur via le widget JS
    # KKiaPay (voir NewSession.jsx). Le front nous transmet ici le
    # transactionId renvoyé par le widget une fois le paiement complété, et
    # NOUS revérifions ce transactionId directement auprès de KKiaPay avant de
    # marquer quoi que ce soit comme payé — on ne fait jamais confiance à la
    # seule affirmation du front.
    @action(detail=True, methods=['post'], url_path='verifier-paiement',
            permission_classes=[IsAuthenticated, IsAdminOrAgent])
    def verifier_paiement_session(self, request, pk=None):
        session = self.get_object()

        if session.statut == 'paye':
            return Response({'error': 'Cette session est déjà payée.'}, status=400)

        numero_momo = request.data.get('numero_momo')
        transaction_id = request.data.get('transaction_id')
        if not numero_momo:
            return Response({'error': 'Numéro Mobile Money requis.'}, status=400)
        if not transaction_id:
            return Response({'error': 'transaction_id requis (renvoyé par le widget KKiaPay).'}, status=400)

        montant = session.cout_fcfa or 0

        try:
            resultat = verifier_transaction(transaction_id)
        except KkiapayError as e:
            return Response({'error': str(e)}, status=502)

        est_paye = resultat.get('status') == 'SUCCESS'

        paiement, _ = Paiements.objects.update_or_create(
            session=session,
            defaults={
                'montant': montant,
                'numero_momo': numero_momo,
                'transaction_id': transaction_id,
                'statut': 'success' if est_paye else 'failed',
                'date_heure': timezone.now(),
            }
        )

        session.statut = 'paye' if est_paye else 'echec'
        session.save(update_fields=['statut'])

        if not est_paye:
            return Response({
                'error': f"Paiement non confirmé par KKiaPay (statut: {resultat.get('status', 'inconnu')}).",
                'transaction_id': transaction_id,
            }, status=402)

        return Response({
            'message': 'Paiement confirmé par KKiaPay.',
            'transaction_id': transaction_id,
            'montant': montant,
            'statut': 'paye',
        }, status=200)

    # ── Action : signaler l'échec/annulation d'un paiement KKiaPay ────────────
    # Déclenchée quand le widget KKiaPay renvoie un échec (addFailedListener) ou
    # que l'utilisateur ferme la popup sans transactionId exploitable. Aucun
    # montant n'a été débité dans ce cas — pas besoin de revérifier auprès de
    # KKiaPay, contrairement à verifier-paiement — on se contente de sortir la
    # session de l'état "en_attente" pour ne pas la laisser bloquée.
    @action(detail=True, methods=['post'], url_path='echec-paiement',
            permission_classes=[IsAuthenticated, IsAdminOrAgent])
    def echec_paiement_session(self, request, pk=None):
        session = self.get_object()

        if session.statut == 'paye':
            return Response({'error': 'Cette session est déjà payée.'}, status=400)

        transaction_id = request.data.get('transaction_id', '')
        raison = request.data.get('raison', '')

        if transaction_id:
            Paiements.objects.update_or_create(
                session=session,
                defaults={
                    'montant': session.cout_fcfa or 0,
                    'numero_momo': request.data.get('numero_momo', ''),
                    'transaction_id': transaction_id,
                    'statut': 'failed',
                    'date_heure': timezone.now(),
                }
            )

        session.statut = 'echec'
        session.save(update_fields=['statut'])

        return Response({'message': raison or 'Paiement échoué.', 'statut': 'echec'}, status=200)

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


class KkiapayConfigView(APIView):
    """
    Fournit au front la clé publique KKiaPay + le mode (sandbox/live) pour
    initialiser le widget de paiement. La clé publique n'est pas un secret
    (elle est de toute façon exposée dans le JS du navigateur par le widget).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'public_key': settings.KKIAPAY_PUBLIC_KEY,
            'sandbox': settings.KKIAPAY_SANDBOX,
        })


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
    permission_classes = [IsAuthenticated, IsAdminOrAgent]

    def get(self, request):
        periode = request.query_params.get('periode', 'mois')
        user_id, role, station_id = _get_user_from_token(request)

        now = timezone.now()
        if periode == 'jour':
            debut = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif periode == 'semaine':
            debut = now - timedelta(days=now.weekday())
            debut = debut.replace(hour=0, minute=0, second=0, microsecond=0)
        else:  # 'mois' par défaut
            debut = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        sessions_qs = Sessions.objects.filter(date_heure__gte=debut)
        if role == 'agent':
            sessions_qs = sessions_qs.filter(station_id=station_id)

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

        # Temporal evolution (timeseries)
        from django.db.models import Avg, F
        from django.db.models.functions import TruncDay, TruncHour
        
        if periode == 'jour':
            trunc_func = TruncHour('date_heure')
        else:
            trunc_func = TruncDay('date_heure')

        evolution = (
            sessions_qs
            .annotate(label=trunc_func)
            .values('label')
            .annotate(
                nb_sessions=Count('id'),
                ca_fcfa=Sum('cout_fcfa'),
                avg_duration_min=Avg(F('pct_cible') - F('pct_depart')) * 0.5
            )
            .order_by('label')
        )

        evolution_serialized = []
        for item in evolution:
            if not item['label']:
                continue
            lbl = item['label']
            if periode == 'jour':
                lbl_str = lbl.strftime('%H:00')
            elif periode == 'semaine':
                lbl_str = lbl.strftime('%a')
            else:
                lbl_str = lbl.strftime('%d/%m')
            
            evolution_serialized.append({
                'name': lbl_str,
                'sessions': item['nb_sessions'] or 0,
                'revenue': float(item['ca_fcfa'] or 0),
                'duration': round(float(item['avg_duration_min'] or 0) / 60, 2) # in hours
            })

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
            'evolution': evolution_serialized
        })