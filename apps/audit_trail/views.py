from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        resource = self.request.query_params.get('resource')
        action = self.request.query_params.get('action')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if resource:
            qs = qs.filter(resource__icontains=resource)
        if action:
            qs = qs.filter(action=action)
        return qs
