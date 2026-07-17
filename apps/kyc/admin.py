from django.contrib import admin
from .models import KYCProfile


@admin.register(KYCProfile)
class KYCProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'cnic', 'status', 'is_pep', 'is_sanctioned', 'risk_level', 'created_at']
    list_filter = ['status', 'is_pep', 'is_sanctioned', 'risk_level']
    search_fields = ['cnic', 'full_name', 'user__email', 'user__username']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'verified_at']
