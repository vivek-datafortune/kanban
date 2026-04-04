import uuid

from django.conf import settings
from django.db import models

from apps.boards.models import Card
from apps.workspaces.models import Workspace


class AISuggestion(models.Model):
    PRIORITY_CHOICES = [
        ("P0", "P0"),
        ("P1", "P1"),
        ("P2", "P2"),
        ("P3", "P3"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name="ai_suggestions"
    )
    subtasks = models.JSONField(default=list)
    description = models.TextField(blank=True, default="")
    suggested_labels = models.JSONField(default=list)  # list of label UUIDs
    priority = models.CharField(max_length=2, choices=PRIORITY_CHOICES, default="P2")
    duplicates = models.JSONField(default=list)  # [{id, title, list_title, similarity}]
    is_accepted = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AI Suggestion for {self.card.title}"


class AIUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="ai_usage"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_usage",
    )
    tokens_input = models.IntegerField(default=0)
    tokens_output = models.IntegerField(default=0)
    model = models.CharField(max_length=100)
    endpoint = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} / {self.model} / {self.endpoint} @ {self.created_at:%Y-%m-%d}"
