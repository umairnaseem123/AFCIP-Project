from django.db import models
from django.conf import settings

class SARReport(models.Model):
    """Suspicious Activity Report"""
    STATUS = [('draft','Draft'),('submitted','Submitted'),('closed','Closed')]
    transaction = models.ForeignKey('transactions.Transaction', on_delete=models.CASCADE, related_name='sar_reports')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='draft')
    reason = models.TextField()
    narrative = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reference_number = models.CharField(max_length=50, blank=True, unique=True)

    def save(self, *args, **kwargs):
        if not self.reference_number:
            import uuid
            self.reference_number = f"SAR-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"SAR {self.reference_number}"


class CTRReport(models.Model):
    """Currency Transaction Report - for transactions > PKR 2.5M"""
    STATUS = [('auto_generated','Auto Generated'),('reviewed','Reviewed'),('filed','Filed')]
    transaction = models.OneToOneField('transactions.Transaction', on_delete=models.CASCADE, related_name='ctr_report')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS, default='auto_generated')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    filed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    reference_number = models.CharField(max_length=50, blank=True, unique=True)

    def save(self, *args, **kwargs):
        if not self.reference_number:
            import uuid
            self.reference_number = f"CTR-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"CTR {self.reference_number} - PKR {self.amount}"


class StructuringAlert(models.Model):
    """Detect structuring (smurfing) - multiple small transactions to avoid CTR threshold"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='structuring_alerts')
    detected_at = models.DateTimeField(auto_now_add=True)
    window_hours = models.IntegerField(default=24)
    transaction_count = models.IntegerField()
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    individual_amounts = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=[('open','Open'),('reviewed','Reviewed'),('false_positive','False Positive'),('escalated','Escalated')], default='open')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Structuring Alert: {self.user} - {self.transaction_count} txns = PKR {self.total_amount}"
