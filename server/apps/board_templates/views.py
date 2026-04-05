from django.db import transaction
from django.db.models import F, Q
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.boards.activity import log_activity
from apps.boards.models import Board, Card, ChecklistItem, Label, List
from apps.boards.serializers import BoardListSerializer
from apps.workspaces.models import Workspace, WorkspaceMembership

from .models import BoardTemplate
from .serializers import BoardTemplateListSerializer, BoardTemplateSerializer


class BoardTemplateListCreateView(generics.ListCreateAPIView):
    """List all visible templates / create a custom template."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BoardTemplateSerializer
        return BoardTemplateListSerializer

    def get_queryset(self):
        return BoardTemplate.objects.filter(
            Q(is_system=True)
            | Q(workspace__memberships__user=self.request.user)
        ).distinct()


class BoardTemplateDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a template."""
    serializer_class = BoardTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BoardTemplate.objects.filter(
            Q(is_system=True)
            | Q(workspace__memberships__user=self.request.user)
        ).distinct()

    def destroy(self, request, *args, **kwargs):
        template = self.get_object()
        if template.is_system:
            return Response(
                {"detail": "System templates cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if template.created_by != request.user:
            # Allow workspace admins to delete workspace templates
            if not template.workspace or not WorkspaceMembership.objects.filter(
                workspace=template.workspace,
                user=request.user,
                role__in=["owner", "admin"],
            ).exists():
                return Response(
                    {"detail": "You do not have permission to delete this template."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SaveAsTemplateView(APIView):
    """POST /api/boards/:id/save-as-template/ — snapshot an existing board."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            board = Board.objects.prefetch_related(
                "lists__cards__labels",
                "lists__cards__checklist_items",
                "labels",
            ).get(pk=pk)
        except Board.DoesNotExist:
            return Response({"detail": "Board not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check user is a workspace member
        if not WorkspaceMembership.objects.filter(
            workspace=board.workspace, user=request.user
        ).exists():
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        title = request.data.get("title", board.title)
        description = request.data.get("description", "")
        category = request.data.get("category", BoardTemplate.Category.GENERAL)

        # Build label name→color map from board labels
        board_labels = {lbl.name: lbl.color for lbl in board.labels.all()}

        # Build data snapshot
        lists_data = []
        for lst in board.lists.filter(is_archived=False).order_by("position"):
            cards_data = []
            for card in lst.cards.all():
                card_labels = [lbl.name for lbl in card.labels.all()]
                checklist = [
                    {"text": item.text}
                    for item in card.checklist_items.all()
                ]
                cards_data.append({
                    "title": card.title,
                    "description": card.description,
                    "labels": card_labels,
                    "checklist": checklist,
                })
            lists_data.append({
                "title": lst.title,
                "position": int(lst.position),
                "cards": cards_data,
            })

        data = {
            "lists": lists_data,
            "labels": [{"name": name, "color": color} for name, color in board_labels.items()],
        }

        template = BoardTemplate.objects.create(
            title=title,
            description=description,
            category=category,
            is_system=False,
            created_by=request.user,
            workspace=board.workspace,
            data=data,
        )

        return Response(BoardTemplateSerializer(template).data, status=status.HTTP_201_CREATED)


class UseTemplateView(APIView):
    """POST /api/templates/:id/use/ — create a new board from a template."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            template = BoardTemplate.objects.get(pk=pk)
        except BoardTemplate.DoesNotExist:
            return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)

        workspace_slug = request.data.get("workspace")
        board_title = request.data.get("title", template.title)
        background_color = request.data.get("background_color", "#e0e5ec")

        if not workspace_slug:
            return Response(
                {"detail": "workspace slug is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            workspace = Workspace.objects.get(slug=workspace_slug)
        except Workspace.DoesNotExist:
            return Response({"detail": "Workspace not found."}, status=status.HTTP_404_NOT_FOUND)

        if not WorkspaceMembership.objects.filter(
            workspace=workspace, user=request.user
        ).exists():
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        data = template.data or {}
        template_labels = data.get("labels", [])
        template_lists = data.get("lists", [])

        with transaction.atomic():
            board = Board.objects.create(
                workspace=workspace,
                title=board_title,
                background_color=background_color,
                created_by=request.user,
            )

            # Create labels and build name→Label map
            label_map = {}
            for lbl_data in template_labels:
                label = Label.objects.create(
                    board=board,
                    name=lbl_data["name"],
                    color=lbl_data.get("color", "#6366f1"),
                )
                label_map[lbl_data["name"]] = label

            # Create lists, cards, checklist items
            for list_data in sorted(template_lists, key=lambda x: x.get("position", 0)):
                lst = List.objects.create(
                    board=board,
                    title=list_data["title"],
                    position=float(list_data.get("position", 1024)),
                )
                for card_idx, card_data in enumerate(list_data.get("cards", [])):
                    card = Card.objects.create(
                        list=lst,
                        title=card_data["title"],
                        description=card_data.get("description", ""),
                        position=float((card_idx + 1) * 1024),
                        created_by=request.user,
                    )
                    # Add labels
                    for label_name in card_data.get("labels", []):
                        if label_name in label_map:
                            card.labels.add(label_map[label_name])

                    # Add checklist items
                    for ci_idx, ci_data in enumerate(card_data.get("checklist", [])):
                        ChecklistItem.objects.create(
                            card=card,
                            text=ci_data["text"],
                            position=float((ci_idx + 1) * 1024),
                        )

            # Increment template use_count
            BoardTemplate.objects.filter(pk=template.pk).update(use_count=F("use_count") + 1)

            log_activity(
                board=board,
                actor=request.user,
                action="board.created_from_template",
                details={"template_id": str(template.pk), "template_title": template.title},
            )

        return Response(
            BoardListSerializer(board, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
