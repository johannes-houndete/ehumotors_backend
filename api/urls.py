from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'clients',      views.ClientViewSet,       basename='clients')
router.register(r'motos',        views.MotoViewSet,         basename='motos')
router.register(r'stations',     views.StationViewSet,      basename='stations')
router.register(r'sessions',     views.SessionViewSet,      basename='sessions')
router.register(r'paiements',    views.PaiementViewSet,     basename='paiements')
router.register(r'tarifs',       views.TarifViewSet,        basename='tarifs')
router.register(r'utilisateurs', views.UtilisateurViewSet,  basename='utilisateurs')

urlpatterns = [
    # Routes explicites AVANT le router : la route détail générée par le
    # router (`paiements/<pk>/`, regex `[^/.]+`) matche n'importe quel segment
    # sans slash — donc "webhook" ou "config" aussi. Si le router est inclus
    # en premier, Django route ces requêtes vers PaiementViewSet.retrieve()
    # au lieu des vues ci-dessous.
    path('dashboard/stats/',      views.DashboardStatsView.as_view(),  name='dashboard-stats'),
    path('paiements/webhook/',    views.KKiapayWebhookView.as_view(),  name='kkiapay-webhook'),
    path('paiements/config/',     views.KkiapayConfigView.as_view(),   name='kkiapay-config'),
    path('', include(router.urls)),
]