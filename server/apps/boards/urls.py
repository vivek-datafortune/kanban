from django.urls import path

from . import views

urlpatterns = [
    # Board CRUD (nested under workspace)
    path(
        "workspaces/<slug:slug>/boards/",
        views.BoardListCreateView.as_view(),
        name="board-list",
    ),
    # Board detail / update / delete
    path("boards/<uuid:pk>/", views.BoardDetailView.as_view(), name="board-detail"),
    # Star / unstar
    path("boards/<uuid:pk>/star/", views.BoardStarView.as_view(), name="board-star"),
    # Labels
    path(
        "boards/<uuid:board_pk>/labels/",
        views.LabelListCreateView.as_view(),
        name="label-list",
    ),
    path(
        "boards/<uuid:board_pk>/labels/<uuid:pk>/",
        views.LabelDetailView.as_view(),
        name="label-detail",
    ),
    # Lists
    path(
        "boards/<uuid:board_pk>/lists/",
        views.ListCreateView.as_view(),
        name="list-create",
    ),
    path("lists/<uuid:pk>/", views.ListDetailView.as_view(), name="list-detail"),
    # Cards
    path(
        "lists/<uuid:list_pk>/cards/",
        views.CardCreateView.as_view(),
        name="card-create",
    ),
    path("cards/<uuid:pk>/", views.CardDetailView.as_view(), name="card-detail"),
    path("cards/<uuid:pk>/move/", views.CardMoveView.as_view(), name="card-move"),
    # Card labels
    path("cards/<uuid:pk>/labels/", views.CardLabelView.as_view(), name="card-labels"),
    path(
        "cards/<uuid:pk>/labels/<uuid:label_pk>/",
        views.CardLabelView.as_view(),
        name="card-label-detail",
    ),
    # Card members
    path(
        "cards/<uuid:pk>/members/",
        views.CardMemberView.as_view(),
        name="card-members",
    ),
    path(
        "cards/<uuid:pk>/members/<int:user_pk>/",
        views.CardMemberView.as_view(),
        name="card-member-detail",
    ),
    # Activity
    path(
        "cards/<uuid:pk>/activity/",
        views.CardActivityView.as_view(),
        name="card-activity",
    ),
    path(
        "boards/<uuid:pk>/activity/",
        views.BoardActivityView.as_view(),
        name="board-activity",
    ),
    # Checklist
    path(
        "cards/<uuid:pk>/checklist/",
        views.ChecklistItemListCreateView.as_view(),
        name="checklist-list",
    ),
    path(
        "checklist/<uuid:pk>/",
        views.ChecklistItemDetailView.as_view(),
        name="checklist-detail",
    ),
    # Comments
    path(
        "cards/<uuid:pk>/comments/",
        views.CommentListCreateView.as_view(),
        name="comment-list",
    ),
    path(
        "comments/<uuid:pk>/",
        views.CommentDetailView.as_view(),
        name="comment-detail",
    ),
]
