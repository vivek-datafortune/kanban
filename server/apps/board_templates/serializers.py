from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import BoardTemplate


class BoardTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing templates (no data field)."""

    class Meta:
        model = BoardTemplate
        fields = (
            "id",
            "title",
            "description",
            "category",
            "is_system",
            "use_count",
            "created_at",
        )
        read_only_fields = ("id", "is_system", "use_count", "created_at")


class BoardTemplateSerializer(serializers.ModelSerializer):
    """Full serializer including data JSON for detail/create."""
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = BoardTemplate
        fields = (
            "id",
            "title",
            "description",
            "category",
            "is_system",
            "created_by",
            "workspace",
            "data",
            "use_count",
            "created_at",
        )
        read_only_fields = ("id", "is_system", "created_by", "use_count", "created_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        validated_data["is_system"] = False
        return super().create(validated_data)
