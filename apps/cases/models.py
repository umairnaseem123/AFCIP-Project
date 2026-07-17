"""Case Management models."""
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class CaseStatus(models.TextChoices):
    OPEN        = 'Open',        'Open'
    IN_PROGRESS = 'In Progress', 'In Progress'
    CLOSED      = 'Closed',      'Closed'


class CasePriority(models.TextChoices):
    HIGH   = 'High',   'High'
    MEDIUM = 'Medium', 'Medium'
    LOW    = 'Low',    'Low'


class Case(models.Model):
    """Investigation case model."""
    case_id     = models.CharField(max_length=20, unique=True, blank=True)
    title       = models.CharField(max_length=255)
    account     = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    status      = models.CharField(max_length=20, choices=CaseStatus.choices,   default=CaseStatus.OPEN)
    priority    = models.CharField(max_length=10, choices=CasePriority.choices, default=CasePriority.MEDIUM)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cases')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cases'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-generate CASE001, CASE002 ...
        if not self.case_id:
            super().save(*args, **kwargs)
            self.case_id = f"CASE{self.pk:03d}"
            Case.objects.filter(pk=self.pk).update(case_id=self.case_id)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.case_id} - {self.title}"


class CaseNote(models.Model):
    """Notes attached to a case."""
    case       = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='notes')
    author     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    note       = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'case_notes'
        ordering = ['created_at']

    def __str__(self):
        return f"Note on {self.case.case_id} by {self.author}"
