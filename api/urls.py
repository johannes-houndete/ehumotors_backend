from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'clients',      views.ClientViewSet,       basename='clients')
router.register(r'stations',     views.StationViewSet,      basename='stations')
router.register(r'sessions',     views.SessionViewSet,      basename='sessions')
router.register(r'paiements',    views.PaiementViewSet,     basename='paiements')
router.register(r'tarifs',       views.TarifViewSet,        basename='tarifs')
router.register(r'utilisateurs', views.UtilisateurViewSet,  basename='utilisateurs')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/',      views.DashboardStatsView.as_view(),  name='dashboard-stats'),
    path('paiements/webhook/',    views.KKiapayWebhookView.as_view(),  name='kkiapay-webhook'),
]