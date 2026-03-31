from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Workspace, WorkspaceInvitation, WorkspaceMembership


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


# ── Invitation Serializers ────────────────────────────────────────────────────


class InvitationListSerializer(serializers.ModelSerializer):
    invited_by = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceInvitation
        fields = (
            "id", "email", "role", "status",
            "invited_by", "created_at", "expires_at",
        )
        read_only_fields = fields


class InvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=[
            (WorkspaceMembership.Role.ADMIN, "Admin"),
            (WorkspaceMembership.Role.MEMBER, "Member"),
        ],
        default=WorkspaceMembership.Role.MEMBER,
    )

    def validate_email(self, value):
        workspace = self.context["workspace"]
        # Already a member?
        if WorkspaceMembership.objects.filter(
            workspace=workspace, user__email=value
        ).exists():
            raise serializers.ValidationError(
                "This user is already a member of the workspace."
            )
        # Already has a pending invitation?
        if WorkspaceInvitation.objects.filter(
            workspace=workspace, email=value, status=WorkspaceInvitation.Status.PENDING
        ).exists():
            raise serializers.ValidationError(
                "A pending invitation already exists for this email."
            )
        return value


class InvitationAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()
