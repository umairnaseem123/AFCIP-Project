"""Transaction views."""
import uuid

import requests
from django.conf import settings
from rest_framework import viewsets
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from drf_spectacular.utils import extend_schema_view, extend_schema
from .models import Transaction, TransactionStatus
from .serializers import TransactionSerializer
from .fraud import check_fraud


@extend_schema_view(
    list=extend_schema(description='List user transactions'),
    retrieve=extend_schema(description='Get transaction details'),
    create=extend_schema(description='Create a transaction and score it for fraud risk'),
)
class TransactionViewSet(viewsets.ModelViewSet):
    """Transaction view operations."""
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['transaction_type', 'status']
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']

    def get_queryset(self):
        if self.request.user.is_admin or self.request.user.is_manager:
            return Transaction.objects.select_related('user').all()
        return Transaction.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Override create so the response can include the fraud_reason."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        data = serializer.data
        data["fraud_reason"] = getattr(self, "_fraud_reason", None)
        return Response(data, status=201, headers=headers)

    def perform_create(self, serializer):
        transaction = serializer.save(
            user=self.request.user,
            reference=f"TXN-{uuid.uuid4().hex[:10].upper()}",
        )
        self._fraud_reason = self._score_transaction(transaction)
        # Refresh serializer.instance so the response reflects the final
        # status/risk fields we just set in _score_transaction.
        serializer.instance = transaction

    def _score_transaction(self, transaction):
        """Run rule-based fraud check, then enrich with the AFCIP ML engine.

        Returns the fraud_reason string (or None) so perform_create can
        attach it to the API response for the frontend modal.
        """
        import time
        t0 = time.monotonic()

        fraud_reason = check_fraud(transaction.user, transaction.amount)
        t1 = time.monotonic()

        payload = {
            "account_no": str(transaction.user_id),
            "amount": float(transaction.amount),
            "location": transaction.location or "Unknown",
            "transaction_count": Transaction.objects.filter(user=transaction.user).count(),
            "transaction_type": transaction.transaction_type,
            "device_type": transaction.device_type or "Unknown",
            "is_new_location": transaction.is_new_location,
        }
        t2 = time.monotonic()

        ml_status = None
        try:
            resp = requests.post(
                f"{settings.ML_SERVICE_URL}/analyze-transaction",
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            transaction.fraud_probability = result.get("fraud_probability")
            transaction.risk_score = result.get("risk_score")
            transaction.risk_level = result.get("status", "")
            ml_status = str(result.get("status", "")).lower()
        except requests.RequestException:
            # ML service unreachable — fall back to rule-based check only.
            pass
        t3 = time.monotonic()

        print(
            f"[TIMING] check_fraud={t1 - t0:.3f}s | "
            f"build_payload={t2 - t1:.3f}s | "
            f"ml_call={t3 - t2:.3f}s | "
            f"total_so_far={t3 - t0:.3f}s"
        )

        # Decide the final transaction status.
        # Priority: rule-based fraud_reason or "high" ML risk -> FAILED.
        # "medium" ML risk -> PENDING (needs review).
        # Otherwise -> COMPLETED.
        if fraud_reason or (ml_status and "high" in ml_status):
            transaction.status = TransactionStatus.FAILED
        elif ml_status and "medium" in ml_status:
            transaction.status = TransactionStatus.PENDING
        else:
            transaction.status = TransactionStatus.COMPLETED

        transaction.save(update_fields=["fraud_probability", "risk_score", "risk_level", "status"])
        transaction.save(update_fields=["fraud_probability", "risk_score", "risk_level", "status"])
        
        # ↓ YE NAYA CODE ADD KARO YAHAN ↓
        from apps.cases.models import Case, CaseStatus, CasePriority
        if fraud_reason or (ml_status and "high" in ml_status):
            Case.objects.create(
                title=f"Auto Case - {transaction.reference}",
                account=str(transaction.user.username or transaction.user.email),
                description=(
                    f"Auto-generated by AFCIP ML Engine.\n"
                    f"Transaction: {transaction.reference}\n"
                    f"Amount: {transaction.amount}\n"
                    f"Fraud Probability: {transaction.fraud_probability}%\n"
                    f"Risk Score: {transaction.risk_score}\n"
                    f"Risk Level: {transaction.risk_level}\n"
                    f"Reason: {fraud_reason or 'High ML Risk'}"
                ),
                status=CaseStatus.OPEN,
                priority=CasePriority.HIGH,
            )
        elif ml_status and "medium" in ml_status:
            Case.objects.create(
                title=f"Review Case - {transaction.reference}",
                account=str(transaction.user.username or transaction.user.email),
                description=(
                    f"Auto-generated: Medium Risk Transaction.\n"
                    f"Transaction: {transaction.reference}\n"
                    f"Amount: {transaction.amount}\n"
                    f"Fraud Probability: {transaction.fraud_probability}%\n"
                    f"Risk Score: {transaction.risk_score}\n"
                    f"Risk Level: {transaction.risk_level}"
                ),
                status=CaseStatus.OPEN,
                priority=CasePriority.MEDIUM,
            )
        # ↑ NAYA CODE KHATAM ↑
        
        return fraud_reason  # ← ye line pehle se hai
        

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .network_graph import build_transaction_network


class TransactionNetworkView(APIView):
    """Returns nodes/edges for transaction network graph visualization."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get('limit', 100))
        user_id = request.query_params.get('user_id')
        data = build_transaction_network(user_id=user_id, limit=limit)
        return Response(data)
