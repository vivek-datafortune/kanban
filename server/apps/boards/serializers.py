from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Board, Card, CardLabel, CardMember, Label, List, StarredBoard


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("id", "name", "color", "board")
        read_only_fields = ("id", "board")


class CardMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CardMember
        fields = ("id", "user")


class CardSerializer(serializers.ModelSerializer):
    labels = LabelSerializer(many=True, read_only=True)
    members = UserSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Card
        fields = (
            "id", "list", "title", "description", "position",
            "due_date", "start_date", "is_completed",
            "labels", "members", "created_by",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")


class CardCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ("title", "description", "position", "due_date", "start_date")
        extra_kwargs = {"position": {"required": False}}

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        validated_data["list_id"] = self.context["list_id"]

        if "position" not in validated_data or validated_data["position"] is None:
            last_card = (
                Card.objects.filter(list_id=validated_data["list_id"])
                .order_by("-position")
                .first()
            )
            validated_data["position"] = (last_card.position + 1024) if last_card else 1024

        return super().create(validated_data)


class CardMoveSerializer(serializers.Serializer):
    list = serializers.UUIDField()
    position = serializers.FloatField()


class ListSerializer(serializers.ModelSerializer):
    cards = CardSerializer(many=True, read_only=True)

    class Meta:
        model = List
        fields = ("id", "board", "title", "position", "is_archived", "cards", "created_at")
        read_only_fields = ("id", "board", "created_at")


class ListCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = List
        fields = ("title", "position")
        extra_kwargs = {"position": {"required": False}}

    def create(self, validated_data):
        validated_data["board_id"] = self.context["board_id"]

        if "position" not in validated_data or validated_data["position"] is None:
            last_list = (
                List.objects.filter(board_id=validated_data["board_id"])
                .order_by("-position")
                .first()
            )
            validated_data["position"] = (last_list.position + 1024) if last_list else 1024

        return super().create(validated_data)


class BoardSerializer(serializers.ModelSerializer):
    lists = ListSerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    is_starred = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Board
        fields = (
            "id", "workspace", "title", "background_color", "visibility",
            "is_starred", "lists", "labels", "created_by",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "workspace", "created_by", "created_at", "updated_at")

    def get_is_starred(self, obj):
        request = self.context.get("request")
        if not request:
            return False
        return StarredBoard.objects.filter(user=request.user, board=obj).exists()


class BoardListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing boards (no nested lists/cards)."""
    is_starred = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = (
            "id", "workspace", "title", "background_color", "visibility",
            "is_starred", "created_at", "updated_at",
        )

    def get_is_starred(self, obj):
        request = self.context.get("request")
        if not request:
            return False
        return StarredBoard.objects.filter(user=request.user, board=obj).exists()


class BoardCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Board
        fields = ("title", "background_color", "visibility")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        validated_data["workspace_id"] = self.context["workspace_id"]
        return super().create(validated_data)
