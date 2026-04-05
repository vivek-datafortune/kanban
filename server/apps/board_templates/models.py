import uuid

from django.conf import settings
from django.db import models

from apps.workspaces.models import Workspace


class BoardTemplate(models.Model):
    class Category(models.TextChoices):
        ENGINEERING = "engineering", "Engineering"
        PRODUCT = "product", "Product"
        DESIGN = "design", "Design"
        MARKETING = "marketing", "Marketing"
        HR = "hr", "HR"
        GENERAL = "general", "General"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.GENERAL,
    )
    is_system = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="board_templates",
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="board_templates",
    )
    # data schema:
    # {
    #   "lists": [
    #     {
    #       "title": str, "position": int,
    #       "cards": [
    #         {"title": str, "description": str, "labels": [str], "checklist": [{"text": str}]}
    #       ]
    #     }
    #   ],
    #   "labels": [{"name": str, "color": str}]
    # }
    data = models.JSONField(default=dict)
    use_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-use_count", "title"]

    def __str__(self):
        return self.title
