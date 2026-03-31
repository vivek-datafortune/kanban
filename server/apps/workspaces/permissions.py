from rest_framework.permissions import BasePermission

from .models import WorkspaceMembership


def _get_membership(request, view):
    slug = view.kwargs.get("slug") or view.kwargs.get("workspace_slug")
    if not slug:
        return None
    try:
        return WorkspaceMembership.objects.get(
            workspace__slug=slug, user=request.user
        )
    except WorkspaceMembership.DoesNotExist:
        return None


class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        return _get_membership(request, view) is not None


class IsWorkspaceAdmin(BasePermission):
    def has_permission(self, request, view):
        membership = _get_membership(request, view)
        if membership is None:
            return False
        return membership.role in (
            WorkspaceMembership.Role.OWNER,
            WorkspaceMembership.Role.ADMIN,
        )


class IsWorkspaceOwner(BasePermission):
    def has_permission(self, request, view):
        membership = _get_membership(request, view)
        if membership is None:
            return False
        return membership.role == WorkspaceMembership.Role.OWNER
