from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .emails import send_invitation_email
from .models import Workspace, WorkspaceInvitation, WorkspaceMembership
from .permissions import IsWorkspaceAdmin, IsWorkspaceMember, IsWorkspaceOwner
from .serializers import (
    AddMemberSerializer,
    ChangeMemberRoleSerializer,
    InvitationAcceptSerializer,
    InvitationCreateSerializer,
    InvitationListSerializer,
    WorkspaceCreateSerializer,
    WorkspaceMembershipSerializer,
    WorkspaceSerializer,
)

User = get_user_model()


class WorkspaceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(
            memberships__user=self.request.user
        ).prefetch_related("memberships")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = serializer.save()
        return Response(
            WorkspaceSerializer(workspace, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Workspace.objects.prefetch_related("memberships")

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), IsWorkspaceMember()]
        if self.request.method == "DELETE":
            return [IsAuthenticated(), IsWorkspaceOwner()]
        return [IsAuthenticated(), IsWorkspaceAdmin()]


class WorkspaceMemberListView(generics.ListCreateAPIView):
    """List members or add a new member to the workspace."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), IsWorkspaceMember()]
        return [IsAuthenticated(), IsWorkspaceAdmin()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AddMemberSerializer
        return WorkspaceMembershipSerializer

    def get_queryset(self):
        return WorkspaceMembership.objects.filter(
            workspace__slug=self.kwargs["slug"]
        ).select_related("user")

    def create(self, request, *args, **kwargs):
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(email=serializer.validated_data["email"])
        except User.DoesNotExist:
            return Response(
                {"detail": "No user found with that email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        workspace = Workspace.objects.get(slug=self.kwargs["slug"])

        if WorkspaceMembership.objects.filter(workspace=workspace, user=user).exists():
            return Response(
                {"detail": "User is already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = WorkspaceMembership.objects.create(
            workspace=workspace,
            user=user,
            role=serializer.validated_data["role"],
        )
        return Response(
            WorkspaceMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )


class WorkspaceMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Change role or remove a member."""
    permission_classes = [IsAuthenticated, IsWorkspaceAdmin]
    serializer_class = WorkspaceMembershipSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return WorkspaceMembership.objects.filter(
            workspace__slug=self.kwargs["slug"]
        ).select_related("user")

    def update(self, request, *args, **kwargs):
        membership = self.get_object()

        if membership.role == WorkspaceMembership.Role.OWNER:
            return Response(
                {"detail": "Cannot change the owner's role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ChangeMemberRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership.role = serializer.validated_data["role"]
        membership.save()
        return Response(WorkspaceMembershipSerializer(membership).data)

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()

        if membership.role == WorkspaceMembership.Role.OWNER:
            return Response(
                {"detail": "Cannot remove the workspace owner."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Invitation Views ──────────────────────────────────────────────────────────


class InvitationListCreateView(generics.ListCreateAPIView):
    """List or create invitations for a workspace."""

    permission_classes = [IsAuthenticated, IsWorkspaceAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return InvitationCreateSerializer
        return InvitationListSerializer

    def get_queryset(self):
        return WorkspaceInvitation.objects.filter(
            workspace__slug=self.kwargs["slug"]
        ).exclude(status=WorkspaceInvitation.Status.ACCEPTED).select_related(
            "invited_by"
        )

    def create(self, request, *args, **kwargs):
        workspace = Workspace.objects.get(slug=self.kwargs["slug"])
        serializer = InvitationCreateSerializer(
            data=request.data, context={"workspace": workspace}
        )
        serializer.is_valid(raise_exception=True)

        invitation = WorkspaceInvitation(
            workspace=workspace,
            email=serializer.validated_data["email"],
            role=serializer.validated_data["role"],
            invited_by=request.user,
        )
        invitation.save()
        send_invitation_email(invitation)

        return Response(
            InvitationListSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class InvitationDeleteView(generics.DestroyAPIView):
    """Hard-delete an invitation."""

    permission_classes = [IsAuthenticated, IsWorkspaceAdmin]
    lookup_field = "pk"

    def get_queryset(self):
        return WorkspaceInvitation.objects.filter(
            workspace__slug=self.kwargs["slug"]
        )


class InvitationResendView(APIView):
    """Resend an invitation — generates a new token and resets expiry."""

    permission_classes = [IsAuthenticated, IsWorkspaceAdmin]

    def post(self, request, slug, pk):
        try:
            invitation = WorkspaceInvitation.objects.get(
                pk=pk, workspace__slug=slug
            )
        except WorkspaceInvitation.DoesNotExist:
            return Response(
                {"detail": "Invitation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Reset token, expiry, and status
        from datetime import timedelta

        from django.utils import timezone

        invitation.token = invitation._generate_token()
        invitation.expires_at = timezone.now() + timedelta(
            days=WorkspaceInvitation.INVITE_EXPIRY_DAYS
        )
        invitation.status = WorkspaceInvitation.Status.PENDING
        invitation.save()
        send_invitation_email(invitation)

        return Response(InvitationListSerializer(invitation).data)


class InvitationRevokeView(APIView):
    """Revoke an invitation — sets status to revoked."""

    permission_classes = [IsAuthenticated, IsWorkspaceAdmin]

    def post(self, request, slug, pk):
        try:
            invitation = WorkspaceInvitation.objects.get(
                pk=pk,
                workspace__slug=slug,
                status=WorkspaceInvitation.Status.PENDING,
            )
        except WorkspaceInvitation.DoesNotExist:
            return Response(
                {"detail": "Invitation not found or not pending."},
                status=status.HTTP_404_NOT_FOUND,
            )

        invitation.status = WorkspaceInvitation.Status.REVOKED
        invitation.save()
        return Response(InvitationListSerializer(invitation).data)


class InvitationAcceptView(APIView):
    """Accept an invitation by token. Top-level endpoint (no workspace slug needed)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InvitationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]

        try:
            invitation = WorkspaceInvitation.objects.select_related(
                "workspace"
            ).get(token=token)
        except WorkspaceInvitation.DoesNotExist:
            return Response(
                {"detail": "Invalid invitation link."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check status
        if invitation.status == WorkspaceInvitation.Status.ACCEPTED:
            return Response(
                {
                    "detail": "Invitation already accepted.",
                    "workspace_slug": invitation.workspace.slug,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invitation.status == WorkspaceInvitation.Status.REVOKED:
            return Response(
                {"detail": "This invitation has been revoked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invitation.is_expired:
            invitation.status = WorkspaceInvitation.Status.EXPIRED
            invitation.save(update_fields=["status"])
            return Response(
                {"detail": "This invitation has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already a member
        if WorkspaceMembership.objects.filter(
            workspace=invitation.workspace, user=request.user
        ).exists():
            invitation.status = WorkspaceInvitation.Status.ACCEPTED
            invitation.save(update_fields=["status"])
            return Response(
                {
                    "detail": "You are already a member of this workspace.",
                    "workspace_slug": invitation.workspace.slug,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create membership and mark accepted
        WorkspaceMembership.objects.create(
            workspace=invitation.workspace,
            user=request.user,
            role=invitation.role,
        )
        invitation.status = WorkspaceInvitation.Status.ACCEPTED
        invitation.save(update_fields=["status"])

        return Response(
            {
                "detail": "Invitation accepted.",
                "workspace_slug": invitation.workspace.slug,
            },
            status=status.HTTP_200_OK,
        )
