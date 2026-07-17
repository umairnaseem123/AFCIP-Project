from rest_framework import serializers
from .models import SARReport, CTRReport, StructuringAlert

class SARReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SARReport
        fields = '__all__'
        read_only_fields = ('reference_number', 'created_at', 'updated_at')

class CTRReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = CTRReport
        fields = '__all__'
        read_only_fields = ('reference_number', 'created_at')

class StructuringAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = StructuringAlert
        fields = '__all__'
