"""Fraud detection logic."""
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


def check_fraud(user, amount):
    from .models import Transaction

    # Rule 1: High value transaction
    if amount > Decimal('500000'):
        return "High value transaction exceeds limit"

    # Rule 2: More than 3 transactions in last 1 minute
    one_minute_ago = timezone.now() - timedelta(minutes=1)
    recent_count = Transaction.objects.filter(
        user=user,
        created_at__gte=one_minute_ago
    ).count()
    if recent_count >= 3:
        return "Rapid transactions detected"

    # Rule 3: More than 5 transactions in last 1 hour
    one_hour_ago = timezone.now() - timedelta(hours=1)
    hourly_count = Transaction.objects.filter(
        user=user,
        created_at__gte=one_hour_ago
    ).count()
    if hourly_count >= 5:
        return "Too many transactions in one hour"

    return None