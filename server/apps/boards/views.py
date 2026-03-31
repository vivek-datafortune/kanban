from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.workspaces.models import Workspace, WorkspaceMembership
from apps.workspaces.permissions import IsWorkspaceAdmin, IsWorkspaceMember

from .models import Board, Card, CardLabel, CardMember, Label, List, StarredBoard
from .serializers import (
    BoardCreateSerializer,
    BoardListSerializer,
    BoardSerializer,
    CardCreateSerializer,
    CardMoveSerializer,
    CardSerializer,
    LabelSerializer,
    ListCreateSerializer,
    ListSerializer,
)


# ── Board views ───────────────────────────────────────────────────────────────

class BoardListCreateView(generics.ListCreateAPIView):
    """List boards in a workspace / create a new board."""
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BoardCreateSerializer
        return BoardListSerializer

    def get_queryset(self):
        slug = self.kwargs["slug"]
        membership = WorkspaceMembership.objects.get(
            workspace__slug=slug, user=self.request.user
        )
        qs = Board.objects.filter(workspace__slug=slug)
        if membership.role == WorkspaceMembership.Role.MEMBER:
            qs = qs.exclude(visibility=Board.Visibility.PRIVATE).union(
                Board.objects.filter(
                    workspace__slug=slug,
                    visibility=Board.Visibility.PRIVATE,
                    created_by=self.request.user,
                )
            )
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        try:
            workspace = Workspace.objects.get(slug=self.kwargs["slug"])
            ctx["workspace_id"] = workspace.id
        except Workspace.DoesNotExist:
            pass
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        board = serializer.save()
        return Response(
            BoardListSerializer(board, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class BoardDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve (with lists+cards), update, or delete a board."""
    serializer_class = BoardSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return Board.objects.prefetch_related(
            "lists__cards__labels",
            "lists__cards__members",
            "lists__cards__created_by",
            "labels",
        ).select_related("created_by")

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # Must be workspace member
        if not WorkspaceMembership.objects.filter(
            workspace=obj.workspace, user=request.user
        ).exists():
            self.permission_denied(request, message="Not a workspace member.")

        if request.method in ("PUT", "PATCH", "DELETE"):
            membership = WorkspaceMembership.objects.get(
                workspace=obj.workspace, user=request.user
            )
            if (
                membership.role == WorkspaceMembership.Role.MEMBER
                and obj.created_by != request.user
            ):
                self.permission_denied(
                    request, message="Only board creator or admins can modify this board."
                )


class BoardStarView(APIView):
    """Toggle star on a board."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            board = Board.objects.get(pk=pk)
        except Board.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        star, created = StarredBoard.objects.get_or_create(
            user=request.user, board=board
        )
        if not created:
            star.delete()
            return Response({"is_starred": False})
        return Response({"is_starred": True}, status=status.HTTP_201_CREATED)


# ── Label views ───────────────────────────────────────────────────────────────

class LabelListCreateView(generics.ListCreateAPIView):
    serializer_class = LabelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Label.objects.filter(board_id=self.kwargs["board_pk"])

    def perform_create(self, serializer):
        serializer.save(board_id=self.kwargs["board_pk"])


class LabelDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LabelSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Label.objects.filter(board_id=self.kwargs["board_pk"])


# ── List views ────────────────────────────────────────────────────────────────

class ListCreateView(generics.CreateAPIView):
    serializer_class = ListCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["board_id"] = self.kwargs["board_pk"]
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lst = serializer.save()
        return Response(
            ListSerializer(lst).data,
            status=status.HTTP_201_CREATED,
        )


class ListDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ListSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    queryset = List.objects.prefetch_related(
        "cards__labels", "cards__members", "cards__created_by"
    )


# ── Card views ────────────────────────────────────────────────────────────────

class CardCreateView(generics.CreateAPIView):
    """Create a card in a list."""
    serializer_class = CardCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["list_id"] = self.kwargs["list_pk"]
        return ctx

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        card = serializer.save()
        return Response(
            CardSerializer(card).data,
            status=status.HTTP_201_CREATED,
        )


class CardDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CardSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    queryset = Card.objects.select_related("created_by").prefetch_related(
        "labels", "members"
    )

    def perform_update(self, serializer):
        serializer.save()


class CardMoveView(APIView):
    """Move a card to a different list and/or position."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            card = Card.objects.get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CardMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        card.list_id = serializer.validated_data["list"]
        card.position = serializer.validated_data["position"]
        card.save(update_fields=["list_id", "position"])

        return Response(CardSerializer(card).data)


class CardLabelView(APIView):
    """Add or remove a label from a card."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        label_id = request.data.get("label_id")
        if not label_id:
            return Response(
                {"detail": "label_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        CardLabel.objects.get_or_create(card_id=pk, label_id=label_id)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk, label_pk):
        deleted, _ = CardLabel.objects.filter(card_id=pk, label_id=label_pk).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardMemberView(APIView):
    """Assign or unassign a member from a card."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response(
                {"detail": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        CardMember.objects.get_or_create(card_id=pk, user_id=user_id)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk, user_pk):
        deleted, _ = CardMember.objects.filter(card_id=pk, user_id=user_pk).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
