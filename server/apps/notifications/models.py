import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        ASSIGNED = "assigned", "Assigned"
        MENTIONED = "mentioned", "Mentioned"
        COMMENT_REPLY = "comment_reply", "Comment Reply"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, default="")
    # Optional links back to context
    card = models.ForeignKey(
        "boards.Card",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="notifications",
    )
    board = models.ForeignKey(
        "boards.Board",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="notifications",
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} — {self.type}: {self.title}"
