from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    card_id = serializers.SerializerMethodField()
    board_id = serializers.SerializerMethodField()
    workspace_slug = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id", "type", "title", "body",
            "card_id", "board_id", "workspace_slug",
            "is_read", "created_at",
        )
        read_only_fields = fields

    def get_card_id(self, obj):
        return str(obj.card_id) if obj.card_id else None

    def get_board_id(self, obj):
        return str(obj.board_id) if obj.board_id else None

    def get_workspace_slug(self, obj):
        return obj.workspace.slug if obj.workspace_id else None
