from django.urls import path

from . import views

urlpatterns = [
    path("", views.WorkspaceListCreateView.as_view(), name="workspace-list"),
    path("<slug:slug>/", views.WorkspaceDetailView.as_view(), name="workspace-detail"),
    path(
        "<slug:slug>/members/",
        views.WorkspaceMemberListView.as_view(),
        name="workspace-members",
    ),
    path(
        "<slug:slug>/members/<uuid:pk>/",
        views.WorkspaceMemberDetailView.as_view(),
        name="workspace-member-detail",
    ),
    # Invitations
    path(
        "<slug:slug>/invitations/",
        views.InvitationListCreateView.as_view(),
        name="workspace-invitations",
    ),
    path(
        "<slug:slug>/invitations/<uuid:pk>/",
        views.InvitationDeleteView.as_view(),
        name="workspace-invitation-delete",
    ),
    path(
        "<slug:slug>/invitations/<uuid:pk>/resend/",
        views.InvitationResendView.as_view(),
        name="workspace-invitation-resend",
    ),
    path(
        "<slug:slug>/invitations/<uuid:pk>/revoke/",
        views.InvitationRevokeView.as_view(),
        name="workspace-invitation-revoke",
    ),
]
