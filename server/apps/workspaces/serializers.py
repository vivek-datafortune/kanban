from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Workspace, WorkspaceMembership


class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMembership
        fields = ("id", "user", "role", "joined_at")
        read_only_fields = ("id", "joined_at")


class WorkspaceSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = (
            "id", "name", "slug", "description",
            "role", "member_count", "created_at", "updated_at",
        )
        read_only_fields = ("id", "slug", "created_at", "updated_at")

    def get_role(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        try:
            membership = obj.memberships.get(user=request.user)
            return membership.role
        except WorkspaceMembership.DoesNotExist:
            return None

    def get_member_count(self, obj):
        return obj.memberships.count()


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ("name", "description")

    def create(self, validated_data):
        user = self.context["request"].user
        workspace = Workspace.objects.create(created_by=user, **validated_data)
        WorkspaceMembership.objects.create(
            workspace=workspace,
            user=user,
            role=WorkspaceMembership.Role.OWNER,
        )
        return workspace


class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            (WorkspaceMembership.Role.ADMIN, "Admin"),
            (WorkspaceMembership.Role.MEMBER, "Member"),
        ],
        default=WorkspaceMembership.Role.MEMBER,
    )


class ChangeMemberRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            (WorkspaceMembership.Role.ADMIN, "Admin"),
            (WorkspaceMembership.Role.MEMBER, "Member"),
        ],
    )
