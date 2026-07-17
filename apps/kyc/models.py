from django.db import models
from django.conf import settings


class KYCProfile(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kyc_profile'
    )
    cnic = models.CharField(max_length=15, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_pep = models.BooleanField(default=False)          # Politically Exposed Person
    is_sanctioned = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    nationality = models.CharField(max_length=100, blank=True)
    risk_level = models.CharField(
        max_length=20,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
        default='low'
    )
    rejection_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'KYC Profile'
        verbose_name_plural = 'KYC Profiles'

    def __str__(self):
        return f"{self.full_name or self.user.username} - {self.cnic} ({self.status})"
