from rest_framework import serializers

from .models import AISuggestion, AIUsage


class AISuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AISuggestion
        fields = (
            "id",
            "card",
            "subtasks",
            "description",
            "suggested_labels",
            "priority",
            "duplicates",
            "is_accepted",
            "is_dismissed",
            "created_at",
        )
        read_only_fields = fields


class AIUsageSummarySerializer(serializers.Serializer):
    total_requests = serializers.IntegerField()
    total_tokens_input = serializers.IntegerField()
    total_tokens_output = serializers.IntegerField()
    model = serializers.CharField()
