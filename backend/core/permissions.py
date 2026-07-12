from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Solo Administrador Global."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'rol', None) == 'ADMIN'
        )


class IsEvaluador(BasePermission):
    """Evaluador TI o Administrador."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsAdminOrReadOnly(BasePermission):
    """Lectura para autenticados; escritura solo admin."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return getattr(request.user, 'rol', None) == 'ADMIN'
