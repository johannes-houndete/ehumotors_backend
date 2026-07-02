from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Autorise uniquement les utilisateurs avec le rôle 'admin'.
    """
    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        if not request.auth:
            return False
        return request.auth.get("role") == "admin"


class IsAdminOrAgent(BasePermission):
    """
    Autorise les utilisateurs avec le rôle 'admin' ou 'agent'.
    """
    message = "Accès réservé aux agents et administrateurs."

    def has_permission(self, request, view):
        if not request.auth:
            return False
        return request.auth.get("role") in ("admin", "agent")
