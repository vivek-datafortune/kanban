from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.workspaces.models import Workspace, WorkspaceMembership
from apps.workspaces.permissions import IsWorkspaceAdmin, IsWorkspaceMember

from apps.realtime.broadcast import broadcast_board_event, broadcast_card_updated, broadcast_workspace_event
from .activity import log_activity
from .models import Board, Card, CardLabel, CardMember, ChecklistItem, Label, List, StarredBoard, Activity
from .serializers import (
    ActivitySerializer,
    BoardCreateSerializer,
    BoardListSerializer,
    BoardSerializer,
    CardCreateSerializer,
    CardMoveSerializer,
    CardSerializer,
    ChecklistItemSerializer,
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
        board_data = BoardListSerializer(board, context={"request": request}).data
        broadcast_workspace_event(
            self.kwargs["slug"],
            "board.created",
            {"board": board_data},
        )
        return Response(board_data, status=status.HTTP_201_CREATED)


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

    def perform_update(self, serializer):
        board = serializer.save()
        payload = {
            "id": str(board.pk),
            "title": board.title,
            "background_color": board.background_color,
            "visibility": board.visibility,
        }
        broadcast_board_event(str(board.pk), "board.updated", payload)
        broadcast_workspace_event(board.workspace.slug, "board.updated", payload)

    def perform_destroy(self, instance):
        board_id = str(instance.pk)
        workspace_slug = instance.workspace.slug
        instance.delete()
        broadcast_board_event(board_id, "board.deleted", {"board_id": board_id})
        broadcast_workspace_event(workspace_slug, "board.deleted", {"board_id": board_id})


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
        broadcast_board_event(
            str(lst.board_id), "list.created", {"list": ListSerializer(lst).data}
        )
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

    def perform_update(self, serializer):
        instance = serializer.save()
        broadcast_board_event(
            str(instance.board_id), "list.updated", {"list": ListSerializer(instance).data}
        )

    def perform_destroy(self, instance):
        board_id = str(instance.board_id)
        list_id = str(instance.id)
        instance.delete()
        broadcast_board_event(board_id, "list.deleted", {"list_id": list_id})


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
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="card.created",
            details={"title": card.title, "list": card.list.title},
        )
        card_data = CardSerializer(card).data
        broadcast_board_event(
            str(card.list.board_id),
            "card.created",
            {"list_id": str(card.list_id), "card": card_data},
        )
        return Response(card_data, status=status.HTTP_201_CREATED)


class CardDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CardSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    queryset = Card.objects.select_related("created_by").prefetch_related(
        "labels", "members"
    )

    def perform_update(self, serializer):
        card = self.get_object()
        old_data = {
            "title": card.title,
            "description": card.description,
            "due_date": str(card.due_date) if card.due_date else None,
        }
        updated = serializer.save()
        # Log what changed
        changes = {}
        if updated.title != old_data["title"]:
            changes["title"] = {"from": old_data["title"], "to": updated.title}
        if updated.description != old_data["description"]:
            changes["description"] = True
        new_due = str(updated.due_date) if updated.due_date else None
        if new_due != old_data["due_date"]:
            changes["due_date"] = {"from": old_data["due_date"], "to": new_due}

        if changes:
            log_activity(
                board=updated.list.board,
                card=updated,
                actor=self.request.user,
                action="card.updated",
                details=changes,
            )
        # Always broadcast a fresh full-card payload so all fields (labels,
        # checklist_items, due_date, etc.) are accurate on all clients.
        broadcast_card_updated(updated.list.board_id, updated.pk)

    def perform_destroy(self, instance):
        board_id = str(instance.list.board_id)
        log_activity(
            board=instance.list.board,
            card=None,
            actor=self.request.user,
            action="card.deleted",
            details={"title": instance.title, "list": instance.list.title},
        )
        card_id = str(instance.id)
        list_id = str(instance.list_id)
        instance.delete()
        broadcast_board_event(
            board_id, "card.deleted", {"card_id": card_id, "list_id": list_id}
        )


class CardMoveView(APIView):
    """Move a card to a different list and/or position."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            card = Card.objects.select_related("list").get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = CardMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_list = card.list
        new_list_id = serializer.validated_data["list"]

        card.list_id = new_list_id
        card.position = serializer.validated_data["position"]
        card.save(update_fields=["list_id", "position"])

        # Log move if list changed
        if str(old_list.id) != str(new_list_id):
            new_list = List.objects.get(pk=new_list_id)
            log_activity(
                board=old_list.board,
                card=card,
                actor=request.user,
                action="card.moved",
                details={"from_list": old_list.title, "to_list": new_list.title},
            )

        broadcast_board_event(
            str(old_list.board_id),
            "card.moved",
            {
                "card_id": str(card.id),
                "from_list_id": str(old_list.id),
                "to_list_id": str(new_list_id),
                "position": card.position,
            },
        )
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
        _, created = CardLabel.objects.get_or_create(card_id=pk, label_id=label_id)
        if created:
            card = Card.objects.select_related("list__board").get(pk=pk)
            label = Label.objects.get(pk=label_id)
            log_activity(
                board=card.list.board,
                card=card,
                actor=request.user,
                action="label.added",
                details={"label_name": label.name, "label_color": label.color},
            )
            broadcast_card_updated(card.list.board_id, pk)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk, label_pk):
        deleted, _ = CardLabel.objects.filter(card_id=pk, label_id=label_pk).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        card = Card.objects.select_related("list__board").get(pk=pk)
        label = Label.objects.get(pk=label_pk)
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="label.removed",
            details={"label_name": label.name, "label_color": label.color},
        )
        broadcast_card_updated(card.list.board_id, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardMemberView(APIView):
    """Assign or unassign a member from a card."""
    permission_classes = [IsAuthenticated]

    def _check_can_assign(self, request, card):
        """Return 403 Response if current user is not workspace owner or admin."""
        workspace = card.list.board.workspace
        try:
            membership = WorkspaceMembership.objects.get(workspace=workspace, user=request.user)
            if membership.role not in ("owner", "admin"):
                return Response(
                    {"detail": "Only workspace owners and admins can assign members."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        except WorkspaceMembership.DoesNotExist:
            return Response(status=status.HTTP_403_FORBIDDEN)
        return None

    def post(self, request, pk):
        try:
            card = Card.objects.select_related("list__board__workspace").get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        err = self._check_can_assign(request, card)
        if err:
            return err
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        _, created = CardMember.objects.get_or_create(card=card, user_id=user_id)
        if created:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            member = User.objects.get(pk=user_id)
            log_activity(
                board=card.list.board,
                card=card,
                actor=request.user,
                action="member.added",
                details={"member_email": member.email, "member_name": member.get_full_name()},
            )
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk, user_pk):
        try:
            card = Card.objects.select_related("list__board__workspace").get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        err = self._check_can_assign(request, card)
        if err:
            return err
        deleted, _ = CardMember.objects.filter(card=card, user_id=user_pk).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        member = User.objects.get(pk=user_pk)
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="member.removed",
            details={"member_email": member.email, "member_name": member.get_full_name()},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Activity views ────────────────────────────────────────────────────────────

class ActivityPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 50


class CardActivityView(generics.ListAPIView):
    """List activity for a specific card (paginated)."""
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ActivityPagination

    def get_queryset(self):
        return Activity.objects.filter(
            card_id=self.kwargs["pk"]
        ).select_related("actor", "card")


class BoardActivityView(generics.ListAPIView):
    """List activity for a board (paginated)."""
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = ActivityPagination

    def get_queryset(self):
        return Activity.objects.filter(
            board_id=self.kwargs["pk"]
        ).select_related("actor", "card")


# ── Checklist views ───────────────────────────────────────────────────────────

class ChecklistItemListCreateView(APIView):
    """GET list / POST create checklist items for a card."""
    permission_classes = [IsAuthenticated]

    def get_card(self, pk):
        try:
            return Card.objects.select_related("list__board").get(pk=pk)
        except Card.DoesNotExist:
            return None

    def get(self, request, pk):
        card = self.get_card(pk)
        if not card:
            return Response(status=status.HTTP_404_NOT_FOUND)
        items = ChecklistItem.objects.filter(card=card)
        return Response(ChecklistItemSerializer(items, many=True).data)

    def post(self, request, pk):
        card = self.get_card(pk)
        if not card:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ChecklistItemSerializer(data=request.data)
        if serializer.is_valid():
            # auto-position: last + 65536
            last = ChecklistItem.objects.filter(card=card).order_by("-position").first()
            position = (last.position + 65536) if last else 65536
            serializer.save(card=card, position=position)
            broadcast_card_updated(card.list.board_id, card.pk)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChecklistItemDetailView(APIView):
    """PATCH update / DELETE a checklist item."""
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return ChecklistItem.objects.select_related("card__list").get(pk=pk)
        except ChecklistItem.DoesNotExist:
            return None

    def patch(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ChecklistItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            if "is_completed" in request.data:
                # Fast optimistic event for toggle
                broadcast_board_event(
                    str(updated.card.list.board_id),
                    "checklist.toggled",
                    {
                        "item_id": str(updated.id),
                        "card_id": str(updated.card_id),
                        "is_completed": updated.is_completed,
                    },
                )
            else:
                # Text or position change — broadcast full card
                broadcast_card_updated(updated.card.list.board_id, updated.card_id)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        item = self.get_object(pk)
        if not item:
            return Response(status=status.HTTP_404_NOT_FOUND)
        board_id = item.card.list.board_id
        card_pk = item.card_id
        item.delete()
        broadcast_card_updated(board_id, card_pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
