"""Role-based access control permissions."""
from rest_framework.permissions import BasePermission

ROLE_HIERARCHY = {
    'viewer': 1,
    'analyst': 2,
    'investigator': 3,
    'supervisor': 4,
    'admin': 5,
}

class HasRole(BasePermission):
    """Check if user has required role or higher."""
    required_role = 'viewer'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', 'viewer')
        user_level = ROLE_HIERARCHY.get(user_role, 0)
        required_level = ROLE_HIERARCHY.get(self.required_role, 99)
        return user_level >= required_level


class IsAnalyst(HasRole):
    required_role = 'analyst'

class IsInvestigator(HasRole):
    required_role = 'investigator'

class IsSupervisor(HasRole):
    required_role = 'supervisor'

class IsAdminUser(HasRole):
    required_role = 'admin'


# Backward-compatible aliases for old views.py imports
IsAdmin = IsAdminUser
IsManager = IsSupervisor

class IsOwnerOrAdmin(BasePermission):
    """Allow access if user owns the object OR is admin role."""

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        user_role = getattr(request.user, 'role', 'viewer')
        if user_role == 'admin':
            return True
        owner_field = getattr(obj, 'user', None) or getattr(obj, 'owner', None)
        return owner_field == request.user
