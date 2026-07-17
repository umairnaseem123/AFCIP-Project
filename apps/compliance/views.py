from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import SARReport, CTRReport, StructuringAlert
from .serializers import SARReportSerializer, CTRReportSerializer, StructuringAlertSerializer

class SARReportViewSet(viewsets.ModelViewSet):
    queryset = SARReport.objects.all()
    serializer_class = SARReportSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        sar = self.get_object()
        sar.status = 'submitted'
        sar.submitted_at = timezone.now()
        sar.save()
        return Response({'status': 'submitted', 'reference': sar.reference_number})

class CTRReportViewSet(viewsets.ModelViewSet):
    queryset = CTRReport.objects.all()
    serializer_class = CTRReportSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def file(self, request, pk=None):
        ctr = self.get_object()
        ctr.status = 'filed'
        ctr.reviewed_by = request.user
        ctr.filed_at = timezone.now()
        ctr.save()
        return Response({'status': 'filed', 'reference': ctr.reference_number})

class StructuringAlertViewSet(viewsets.ModelViewSet):
    queryset = StructuringAlert.objects.all()
    serializer_class = StructuringAlertSerializer
    permission_classes = [IsAuthenticated]
