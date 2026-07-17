from django.apps import AppConfig


class KycConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.kyc'
    verbose_name = 'KYC Management'

    def ready(self):
        import apps.kyc.signals  # noqa: F401  -- signal registration
