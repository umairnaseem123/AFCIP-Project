"""Compliance detection services."""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

CTR_THRESHOLD = Decimal('2500000')  # PKR 2.5 million
STRUCTURING_WINDOW_HOURS = 24
STRUCTURING_COUNT_MIN = 3
STRUCTURING_AMOUNT_MIN = Decimal('1800000')  # Just under CTR threshold


def check_ctr(transaction):
    """Auto-generate CTR if transaction exceeds threshold."""
    from .models import CTRReport
    if transaction.amount >= CTR_THRESHOLD:
        ctr, created = CTRReport.objects.get_or_create(
            transaction=transaction,
            defaults={'amount': transaction.amount}
        )
        return ctr, created
    return None, False


def check_structuring(user):
    """Detect structuring pattern: multiple transactions just under CTR threshold."""
    from apps.transactions.models import Transaction
    from .models import StructuringAlert

    window_start = timezone.now() - timedelta(hours=STRUCTURING_WINDOW_HOURS)
    recent_txns = Transaction.objects.filter(
        user=user,
        created_at__gte=window_start,
        amount__lt=CTR_THRESHOLD,
        amount__gte=Decimal('500000')
    ).order_by('created_at')

    if recent_txns.count() >= STRUCTURING_COUNT_MIN:
        total = sum(t.amount for t in recent_txns)
        if total >= STRUCTURING_AMOUNT_MIN:
            alert = StructuringAlert.objects.create(
                user=user,
                window_hours=STRUCTURING_WINDOW_HOURS,
                transaction_count=recent_txns.count(),
                total_amount=total,
                individual_amounts=[str(t.amount) for t in recent_txns],
            )
            return alert
    return None
