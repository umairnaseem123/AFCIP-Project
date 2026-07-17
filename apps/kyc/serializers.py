from rest_framework import serializers
from django.utils import timezone
from .models import KYCProfile


class KYCProfileSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    email = serializers.CharField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = KYCProfile
        fields = [
            'id',
            'customer_name',
            'username',
            'email',
            'cnic',
            'status',
            'is_pep',
            'is_sanctioned',
            'full_name',
            'date_of_birth',
            'address',
            'phone_number',
            'nationality',
            'risk_level',
            'rejection_reason',
            'notes',
            'created_at',
            'updated_at',
            'verified_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'verified_at', 'customer_name', 'email', 'username']

    def get_customer_name(self, obj):
        full = obj.user.get_full_name()
        return full if full.strip() else obj.user.username

    def update(self, instance, validated_data):
        # Auto-set verified_at when status changes to verified
        if validated_data.get('status') == 'verified' and instance.status != 'verified':
            validated_data['verified_at'] = timezone.now()
        elif validated_data.get('status') in ['pending', 'rejected']:
            validated_data['verified_at'] = None
        return super().update(instance, validated_data)


class KYCProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = KYCProfile
        fields = [
            'user',
            'cnic',
            'status',
            'is_pep',
            'is_sanctioned',
            'full_name',
            'date_of_birth',
            'address',
            'phone_number',
            'nationality',
            'risk_level',
            'rejection_reason',
            'notes',
        ]

    def validate_cnic(self, value):
        # Remove dashes if present and validate format
        cnic = value.replace('-', '')
        if not cnic.isdigit():
            raise serializers.ValidationError("CNIC must contain only digits.")
        if len(cnic) != 13:
            raise serializers.ValidationError("CNIC must be exactly 13 digits.")
        return value

    def create(self, validated_data):
        instance = super().create(validated_data)
        if instance.status == 'verified':
            instance.verified_at = timezone.now()
            instance.save()
        return instance


class KYCStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    verified = serializers.IntegerField()
    pending = serializers.IntegerField()
    rejected = serializers.IntegerField()
    pep_flagged = serializers.IntegerField()
    sanctioned = serializers.IntegerField()
