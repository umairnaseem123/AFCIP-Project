"""
kyc/management/commands/backfill_kyc.py

Purane users (jo signal lagne se pehle bane the) ke liye
one-time KYCProfile backfill karta hai.

Chalane ka tareeqa:
    python manage.py backfill_kyc
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.kyc.models import KYCProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Backfill KYCProfile for existing users that do not have one yet.'

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        for user in User.objects.all():
            profile, created = KYCProfile.objects.get_or_create(
                user=user,
                defaults={
                    'cnic': f'PENDING-{user.id}',
                    'full_name': user.get_full_name() or user.username,
                    'status': 'pending',
                }
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'{created_count} naye KYC profiles bana diye gaye. '
                f'{skipped_count} already maujood thay.'
            )
        )
