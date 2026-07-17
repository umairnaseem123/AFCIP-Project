"""
KYC Profile auto-creation signal.

Jab bhi naya User register/create ho, uska ek blank/pending
KYCProfile automatically ban jaye — taake KYC Management page
har user ko list kare, chahe usne CNIC abhi diya ho ya nahi.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

from .models import KYCProfile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_kyc_profile_on_user_create(sender, instance, created, **kwargs):
    if not created:
        return

    KYCProfile.objects.get_or_create(
        user=instance,
        defaults={
            'cnic': f'PENDING-{instance.id}',
            'full_name': instance.get_full_name() or instance.username,
            'status': 'pending',
        }
    )
