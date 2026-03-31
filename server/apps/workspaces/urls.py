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
]
