from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    ACTION_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('export', 'Export'),
        ('verify', 'Verify'),
        ('flag', 'Flag'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    resource = models.CharField(max_length=100)  # e.g. "Transaction", "KYC"
    resource_id = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.action} {self.resource} at {self.timestamp}"
