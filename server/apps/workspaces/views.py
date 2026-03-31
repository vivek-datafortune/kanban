from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Workspace, WorkspaceMembership
from .permissions import IsWorkspaceAdmin, IsWorkspaceMember, IsWorkspaceOwner
from .serializers import (
    AddMemberSerializer,
    ChangeMemberRoleSerializer,
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
