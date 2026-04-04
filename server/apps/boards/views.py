import re

from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.workspaces.models import Workspace, WorkspaceMembership
from apps.workspaces.permissions import IsWorkspaceAdmin, IsWorkspaceMember

from apps.realtime.broadcast import broadcast_board_event, broadcast_card_updated, broadcast_workspace_event
from .activity import log_activity
from .models import Attachment, Board, Card, CardLabel, CardMember, ChecklistItem, Comment, Label, List, StarredBoard, Activity, TimeEntry
from .serializers import (
    ActivitySerializer,
    AttachmentSerializer,
    BoardCreateSerializer,
    BoardListSerializer,
    BoardSerializer,
    CardCreateSerializer,
    CardMoveSerializer,
    CardSerializer,
    ChecklistItemSerializer,
    CommentSerializer,
    LabelSerializer,
    ListCreateSerializer,
    ListSerializer,
    TimeEntrySerializer,
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
            # Don't notify if someone assigns themselves
            if member.pk != request.user.pk:
                from apps.notifications.models import Notification
                from apps.realtime.broadcast import broadcast_notification
                actor_name = request.user.get_full_name() or request.user.email
                notif = Notification.objects.create(
                    user=member,
                    type=Notification.Type.ASSIGNED,
                    title=f"{actor_name} assigned you to \"{card.title}\"",
                    body=f"In board: {card.list.board.title}",
                    card=card,
                    board=card.list.board,
                    workspace=card.list.board.workspace,
                )
                broadcast_notification(member.pk, notif)
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


# ── Comment views ──────────────────────────────────────────────────────────────

class CommentPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100


class CommentListCreateView(APIView):
    """List top-level comments for a card / create a new comment or reply."""
    permission_classes = [IsAuthenticated]
    pagination_class = CommentPagination

    def _get_card(self, pk):
        try:
            return Card.objects.select_related("list__board").get(pk=pk)
        except Card.DoesNotExist:
            return None

    def get(self, request, pk):
        card = self._get_card(pk)
        if not card:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Only return top-level comments; replies are nested inside them
        qs = (
            Comment.objects.filter(card=card, parent=None)
            .select_related("author")
            .prefetch_related("replies__author")
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request)
        serializer = CommentSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, pk):
        card = self._get_card(pk)
        if not card:
            return Response(status=status.HTTP_404_NOT_FOUND)

        parent_id = request.data.get("parent")
        if parent_id:
            try:
                parent = Comment.objects.get(pk=parent_id, card=card, parent=None)
            except Comment.DoesNotExist:
                return Response(
                    {"detail": "Parent comment not found or is already a reply."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            parent = None

        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            comment = serializer.save(card=card, author=request.user, parent=parent)
            log_activity(
                board=card.list.board,
                card=card,
                actor=request.user,
                action="comment.added",
                details={"body_preview": comment.body[:100]},
            )
            # Re-fetch with author so serializer output is complete
            comment.refresh_from_db()
            comment.author  # already loaded via save
            out = CommentSerializer(
                Comment.objects.select_related("author")
                .prefetch_related("replies__author")
                .get(pk=comment.pk)
            )
            board_id = str(card.list.board_id)
            broadcast_board_event(board_id, "comment.added", {
                "card_id": str(card.pk),
                "comment": out.data,
            })
            actor_name = request.user.get_full_name() or request.user.email
            # Notify the parent comment author when someone replies (skip self-replies)
            if parent and parent.author_id != request.user.pk:
                from apps.notifications.models import Notification
                from apps.realtime.broadcast import broadcast_notification
                notif = Notification.objects.create(
                    user=parent.author,
                    type=Notification.Type.COMMENT_REPLY,
                    title=f"{actor_name} replied to your comment on \"{card.title}\"",
                    body=comment.body[:200],
                    card=card,
                    board=card.list.board,
                    workspace=card.list.board.workspace,
                )
                broadcast_notification(parent.author_id, notif)
            # @mention notifications
            mentioned_emails = set(re.findall(
                r'@([\w.!#$%&\'*+/=?^_`{|}~\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})',
                comment.body, re.IGNORECASE,
            ))
            if mentioned_emails:
                from django.contrib.auth import get_user_model
                from apps.notifications.models import Notification as MentionNotif
                from apps.realtime.broadcast import broadcast_notification as bn_mention
                _User = get_user_model()
                mentioned_users = _User.objects.filter(
                    email__in=mentioned_emails,
                    workspace_memberships__workspace=card.list.board.workspace,
                ).exclude(pk=request.user.pk)
                for mu in mentioned_users:
                    mn = MentionNotif.objects.create(
                        user=mu,
                        type=MentionNotif.Type.MENTIONED,
                        title=f"{actor_name} mentioned you in \"{card.title}\"",
                        body=comment.body[:200],
                        card=card,
                        board=card.list.board,
                        workspace=card.list.board.workspace,
                    )
                    bn_mention(mu.pk, mn)
            return Response(out.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentDetailView(APIView):
    """Edit or delete a comment."""
    permission_classes = [IsAuthenticated]

    def _get_comment(self, pk):
        try:
            return Comment.objects.select_related("author", "card__list__board").get(pk=pk)
        except Comment.DoesNotExist:
            return None

    def patch(self, request, pk):
        comment = self._get_comment(pk)
        if not comment:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if comment.author != request.user:
            return Response(
                {"detail": "Only the author can edit this comment."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = CommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            board_id = str(comment.card.list.board_id)
            broadcast_board_event(board_id, "comment.updated", {
                "card_id": str(comment.card_id),
                "comment": serializer.data,
            })
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        comment = self._get_comment(pk)
        if not comment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Author, or workspace admin/owner can delete
        workspace = comment.card.list.board.workspace
        membership = WorkspaceMembership.objects.filter(
            workspace=workspace, user=request.user
        ).first()
        is_admin = membership and membership.role in ("owner", "admin")

        if comment.author != request.user and not is_admin:
            return Response(
                {"detail": "You do not have permission to delete this comment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        board_id = str(comment.card.list.board_id)
        card_id = str(comment.card_id)
        comment_id = str(comment.pk)
        parent_id = str(comment.parent_id) if comment.parent_id else None
        comment.delete()
        broadcast_board_event(board_id, "comment.deleted", {
            "card_id": card_id,
            "comment_id": comment_id,
            "parent_id": parent_id,
        })
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Attachment views ──────────────────────────────────────────────────────────

class AttachmentListCreateView(APIView):
    """GET list / POST upload attachments for a card."""
    permission_classes = [IsAuthenticated]

    def _get_card(self, pk):
        try:
            return Card.objects.select_related("list__board__workspace").get(pk=pk)
        except Card.DoesNotExist:
            return None

    def get(self, request, pk):
        card = self._get_card(pk)
        if not card:
            return Response(status=status.HTTP_404_NOT_FOUND)
        from .models import Attachment
        attachments = Attachment.objects.filter(card=card).select_related("uploaded_by")
        serializer = AttachmentSerializer(attachments, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request, pk):
        from .models import Attachment, ALLOWED_CONTENT_TYPES, MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS_PER_CARD
        card = self._get_card(pk)
        if not card:
            return Response(status=status.HTTP_404_NOT_FOUND)

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate content type
        content_type = file.content_type or "application/octet-stream"
        if content_type not in ALLOWED_CONTENT_TYPES:
            return Response(
                {"detail": f"File type '{content_type}' is not allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate size
        if file.size > MAX_ATTACHMENT_SIZE:
            mb = MAX_ATTACHMENT_SIZE // (1024 * 1024)
            return Response(
                {"detail": f"File exceeds the {mb}MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate count
        if Attachment.objects.filter(card=card).count() >= MAX_ATTACHMENTS_PER_CARD:
            return Response(
                {"detail": f"Cards can have at most {MAX_ATTACHMENTS_PER_CARD} attachments."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attachment = Attachment.objects.create(
            card=card,
            file=file,
            filename=file.name,
            size=file.size,
            content_type=content_type,
            uploaded_by=request.user,
        )
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="attachment.added",
            details={"filename": file.name},
        )
        broadcast_card_updated(card.list.board_id, card.pk)
        serializer = AttachmentSerializer(attachment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttachmentDetailView(APIView):
    """DELETE an attachment."""
    permission_classes = [IsAuthenticated]

    def _get_attachment(self, pk):
        from .models import Attachment
        try:
            return Attachment.objects.select_related(
                "uploaded_by", "card__list__board__workspace"
            ).get(pk=pk)
        except Attachment.DoesNotExist:
            return None

    def delete(self, request, pk):
        attachment = self._get_attachment(pk)
        if not attachment:
            return Response(status=status.HTTP_404_NOT_FOUND)

        workspace = attachment.card.list.board.workspace
        membership = WorkspaceMembership.objects.filter(
            workspace=workspace, user=request.user
        ).first()
        is_admin = membership and membership.role in ("owner", "admin")

        if attachment.uploaded_by != request.user and not is_admin:
            return Response(
                {"detail": "You do not have permission to delete this attachment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        card = attachment.card
        attachment.file.delete(save=False)  # delete from S3/MinIO
        attachment.delete()
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="attachment.removed",
            details={"filename": attachment.filename},
        )
        broadcast_card_updated(card.list.board_id, card.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Time Tracking views ───────────────────────────────────────────────────────

class TimeEntryListView(APIView):
    """GET all time entries for a card."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            card = Card.objects.get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        entries = TimeEntry.objects.filter(card=card).select_related("user")
        return Response(TimeEntrySerializer(entries, many=True).data)


class TimerStartView(APIView):
    """POST — start a new timer for the requesting user on this card."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            card = Card.objects.select_related("list__board").get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Stop any existing running timer for this user
        running = TimeEntry.objects.filter(
            user=request.user, ended_at__isnull=True, is_manual=False
        ).select_related("card__list__board").first()
        if running:
            from django.utils import timezone
            from datetime import timedelta
            running.ended_at = timezone.now()
            running.duration = running.ended_at - running.started_at
            running.save(update_fields=["ended_at", "duration"])

        from django.utils import timezone
        entry = TimeEntry.objects.create(
            card=card,
            user=request.user,
            started_at=timezone.now(),
        )
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="time.started",
            details={},
        )
        return Response(TimeEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class TimerStopView(APIView):
    """POST — stop the user's running timer on this card."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            card = Card.objects.select_related("list__board").get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        entry = TimeEntry.objects.filter(
            card=card, user=request.user, ended_at__isnull=True, is_manual=False
        ).first()
        if not entry:
            return Response(
                {"detail": "No running timer found for this card."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone
        entry.ended_at = timezone.now()
        entry.duration = entry.ended_at - entry.started_at
        entry.save(update_fields=["ended_at", "duration"])
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="time.stopped",
            details={"seconds": int(entry.duration.total_seconds())},
        )
        broadcast_card_updated(card.list.board_id, card.pk)
        return Response(TimeEntrySerializer(entry).data)


class ManualTimeEntryView(APIView):
    """POST — add a manual time entry {duration_seconds, note}."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            card = Card.objects.select_related("list__board").get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        duration_seconds = request.data.get("duration_seconds")
        if not duration_seconds:
            return Response({"detail": "duration_seconds is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            duration_seconds = int(duration_seconds)
            if duration_seconds <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"detail": "duration_seconds must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import timedelta
        from django.utils import timezone
        now = timezone.now()
        entry = TimeEntry.objects.create(
            card=card,
            user=request.user,
            started_at=now,
            ended_at=now,
            duration=timedelta(seconds=duration_seconds),
            note=request.data.get("note", ""),
            is_manual=True,
        )
        log_activity(
            board=card.list.board,
            card=card,
            actor=request.user,
            action="time.logged",
            details={"seconds": duration_seconds, "note": entry.note},
        )
        broadcast_card_updated(card.list.board_id, card.pk)
        return Response(TimeEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class TimeEntryDetailView(APIView):
    """DELETE a time entry."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            entry = TimeEntry.objects.select_related("user", "card__list__board__workspace").get(pk=pk)
        except TimeEntry.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        workspace = entry.card.list.board.workspace
        membership = WorkspaceMembership.objects.filter(workspace=workspace, user=request.user).first()
        is_admin = membership and membership.role in ("owner", "admin")

        if entry.user != request.user and not is_admin:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        card = entry.card
        entry.delete()
        broadcast_card_updated(card.list.board_id, card.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardEstimateView(APIView):
    """PATCH — update estimated_hours on a card."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            card = Card.objects.get(pk=pk)
        except Card.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        estimated_hours = request.data.get("estimated_hours")
        if estimated_hours is None:
            return Response({"detail": "estimated_hours is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            val = float(estimated_hours)
            if val < 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"detail": "estimated_hours must be a non-negative number."}, status=status.HTTP_400_BAD_REQUEST)

        card.estimated_hours = val if val > 0 else None
        card.save(update_fields=["estimated_hours"])
        return Response({"estimated_hours": card.estimated_hours})


class BoardTimeReportView(APIView):
    """GET aggregated time per user per card for a board."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            board = Board.objects.get(pk=pk)
        except Board.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        from django.db.models import Sum
        from datetime import timedelta

        entries = (
            TimeEntry.objects.filter(card__list__board=board, duration__isnull=False)
            .select_related("user", "card")
        )

        # Build report: [{user, card_id, card_title, total_seconds}]
        aggregated: dict[tuple, dict] = {}
        for entry in entries:
            key = (entry.user_id, entry.card_id)
            if key not in aggregated:
                aggregated[key] = {
                    "user": {
                        "pk": entry.user.pk,
                        "email": entry.user.email,
                        "first_name": entry.user.first_name,
                        "last_name": entry.user.last_name,
                    },
                    "card_id": str(entry.card_id),
                    "card_title": entry.card.title,
                    "total_seconds": 0,
                }
            aggregated[key]["total_seconds"] += int(entry.duration.total_seconds())

        return Response(list(aggregated.values()))
