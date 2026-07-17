"""Case serializers."""
from rest_framework import serializers
from .models import Case, CaseNote


class CaseNoteSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    date   = serializers.SerializerMethodField()

    class Meta:
        model  = CaseNote
        fields = ['id', 'case', 'author', 'note', 'date', 'created_at']
        read_only_fields = ['id', 'case', 'author', 'date', 'created_at']

    def get_author(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.username or obj.author.email
        return "Agent"

    def get_date(self, obj):
        return obj.created_at.strftime("%Y-%m-%d") if obj.created_at else ""


class CaseSerializer(serializers.ModelSerializer):
    date       = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    class Meta:
        model  = Case
        fields = [
            'id', 'case_id', 'title', 'account', 'description',
            'status', 'priority', 'date', 'created_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'case_id', 'date', 'created_by', 'created_at', 'updated_at']

    def get_date(self, obj):
        return obj.created_at.strftime("%Y-%m-%d") if obj.created_at else ""

    def get_created_by(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System"
