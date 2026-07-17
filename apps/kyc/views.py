from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import KYCProfile
from .serializers import KYCProfileSerializer, KYCProfileCreateSerializer, KYCStatsSerializer
from apps.cases.models import Case, CaseStatus, CasePriority


class KYCProfileViewSet(viewsets.ModelViewSet):
    queryset = KYCProfile.objects.select_related('user').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'is_pep', 'is_sanctioned', 'risk_level']
    search_fields = ['cnic', 'full_name', 'user__email', 'user__username', 'phone_number']
    ordering_fields = ['created_at', 'updated_at', 'status', 'full_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create']:
            return KYCProfileCreateSerializer
        return KYCProfileSerializer

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Return summary statistics for the KYC dashboard cards."""
        qs = KYCProfile.objects.all()
        data = {
            'total': qs.count(),
            'verified': qs.filter(status='verified').count(),
            'pending': qs.filter(status='pending').count(),
            'rejected': qs.filter(status='rejected').count(),
            'pep_flagged': qs.filter(is_pep=True).count(),
            'sanctioned': qs.filter(is_sanctioned=True).count(),
        }
        serializer = KYCStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        """Quickly mark a KYC profile as verified."""
        profile = self.get_object()
        profile.status = 'verified'
        profile.verified_at = timezone.now()
        profile.save()
        return Response(KYCProfileSerializer(profile).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Quickly mark a KYC profile as rejected."""
        profile = self.get_object()
        profile.status = 'rejected'
        profile.verified_at = None
        reason = request.data.get('reason', '')
        if reason:
            profile.rejection_reason = reason
        profile.save()
        return Response(KYCProfileSerializer(profile).data)

    @action(detail=True, methods=['post'], url_path='flag-pep')
    def flag_pep(self, request, pk=None):
        """Toggle PEP flag — auto-creates a High priority Case when flagged."""
        profile = self.get_object()
        profile.is_pep = not profile.is_pep
        profile.save()

        # Auto Case: PEP flagged
        if profile.is_pep:
            Case.objects.create(
                title=f"PEP Flagged - {profile.full_name or profile.user.username}",
                account=str(profile.user.username),
                description=(
                    f"KYC Profile flagged as Politically Exposed Person (PEP).\n"
                    f"Full Name : {profile.full_name or 'N/A'}\n"
                    f"CNIC      : {profile.cnic}\n"
                    f"Risk Level: {profile.risk_level}\n"
                    f"Flagged by: {request.user.username}"
                ),
                status=CaseStatus.OPEN,
                priority=CasePriority.HIGH,
            )

        return Response(KYCProfileSerializer(profile).data)

    @action(detail=True, methods=['post'], url_path='flag-sanctioned')
    def flag_sanctioned(self, request, pk=None):
        """Toggle Sanctioned flag — auto-creates a High priority Case when sanctioned."""
        profile = self.get_object()
        profile.is_sanctioned = not profile.is_sanctioned
        profile.save()

        # Auto Case: Sanctioned
        if profile.is_sanctioned:
            Case.objects.create(
                title=f"Sanctioned Person - {profile.full_name or profile.user.username}",
                account=str(profile.user.username),
                description=(
                    f"KYC Profile marked as Sanctioned.\n"
                    f"Full Name : {profile.full_name or 'N/A'}\n"
                    f"CNIC      : {profile.cnic}\n"
                    f"Risk Level: {profile.risk_level}\n"
                    f"Flagged by: {request.user.username}"
                ),
                status=CaseStatus.OPEN,
                priority=CasePriority.HIGH,
            )

        return Response(KYCProfileSerializer(profile).data)

    @action(detail=True, methods=['post'], url_path='update-risk')
    def update_risk(self, request, pk=None):
        """Update risk level — auto-creates a Case if risk is set to High."""
        profile = self.get_object()
        new_risk = request.data.get('risk_level', '').lower()

        if new_risk not in ['low', 'medium', 'high']:
            return Response(
                {'error': 'Invalid risk_level. Choose: low, medium, high'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_risk = profile.risk_level
        profile.risk_level = new_risk
        profile.save()

        # Auto Case: Risk upgraded to High
        if new_risk == 'high' and old_risk != 'high':
            Case.objects.create(
                title=f"High Risk KYC - {profile.full_name or profile.user.username}",
                account=str(profile.user.username),
                description=(
                    f"KYC Profile risk level upgraded to HIGH.\n"
                    f"Full Name  : {profile.full_name or 'N/A'}\n"
                    f"CNIC       : {profile.cnic}\n"
                    f"Previous   : {old_risk}\n"
                    f"New Level  : {new_risk}\n"
                    f"Updated by : {request.user.username}"
                ),
                status=CaseStatus.OPEN,
                priority=CasePriority.HIGH,
            )

        return Response(KYCProfileSerializer(profile).data)