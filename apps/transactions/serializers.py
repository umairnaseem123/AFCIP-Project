"""Transaction serializers."""
from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    """Transaction serializer."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    kyc_name = serializers.SerializerMethodField()
    kyc_status = serializers.SerializerMethodField()
    kyc_is_pep = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = ['id', 'user', 'user_email',
                  'kyc_name', 'kyc_status', 'kyc_is_pep',
                  'transaction_type', 'amount',
                  'status', 'reference', 'description', 'location', 'device_type',
                  'is_new_location', 'fraud_probability', 'risk_score', 'risk_level',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'reference', 'fraud_probability',
                             'risk_score', 'risk_level', 'created_at', 'updated_at']

    def get_kyc_name(self, obj):
        try:
            return obj.user.kyc_profile.full_name or obj.user.get_full_name() or None
        except Exception:
            return None

    def get_kyc_status(self, obj):
        try:
            return obj.user.kyc_profile.status
        except Exception:
            return None

    def get_kyc_is_pep(self, obj):
        try:
            return obj.user.kyc_profile.is_pep
        except Exception:
            return False
