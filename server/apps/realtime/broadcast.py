import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.serializers.json import DjangoJSONEncoder


def _make_serializable(obj: dict) -> dict:
    """Convert a dict to a msgpack-safe structure by round-tripping through JSON.

    This handles UUID, datetime, Decimal, and any other type that
    DjangoJSONEncoder knows about but msgpack does not.
    """
    return json.loads(json.dumps(obj, cls=DjangoJSONEncoder))


def get_full_card_data(card_pk) -> dict:
    """Re-fetch a card with all relations and return serialized data.

    Use this whenever you need to broadcast card.updated with accurate
    labels, members, and checklist_items.
    """
    from apps.boards.models import Card
    from apps.boards.serializers import CardSerializer

    card = (
        Card.objects.select_related("list__board", "created_by")
        .prefetch_related("labels", "members", "checklist_items")
        .get(pk=card_pk)
    )
    return _make_serializable(CardSerializer(card).data)


def broadcast_board_event(board_id: str, event_type: str, payload: dict) -> None:
    """Send a board event to all WebSocket clients watching a board."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"board_{board_id}",
        {
            "type": "board.event",
            "event_type": event_type,
            "payload": _make_serializable(payload),
        },
    )


def broadcast_workspace_event(workspace_slug: str, event_type: str, payload: dict) -> None:
    """Send an event to all WebSocket clients watching a workspace."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"workspace_{workspace_slug}",
        {
            "type": "workspace.event",
            "event_type": event_type,
            "payload": _make_serializable(payload),
        },
    )


def broadcast_card_updated(board_id: str, card_pk) -> None:
    """Convenience wrapper: broadcast card.updated with fresh full card data."""
    broadcast_board_event(
        str(board_id),
        "card.updated",
        {"card": get_full_card_data(card_pk)},
    )
