from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone


class BoardConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.board_id = self.scope["url_route"]["kwargs"]["board_id"]
        self.group_name = f"board_{self.board_id}"
        self.user = user

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "presence.event",
                "event_type": "user.joined",
                "payload": {
                    "user_id": str(user.id),
                    "email": user.email,
                    "name": user.get_full_name(),
                },
            },
        )

    async def disconnect(self, close_code):
        if not hasattr(self, "group_name"):
            return

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "presence.event",
                "event_type": "user.left",
                "payload": {
                    "user_id": str(self.user.id),
                    "email": self.user.email,
                    "name": self.user.get_full_name(),
                },
            },
        )
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        # Server is the sole broadcaster — ignore client messages
        pass

    # ── Message handlers ─────────────────────────────────────────────────────

    async def board_event(self, event):
        """Relay board data events (card.moved, list.created, etc.)"""
        await self.send_json(
            {
                "type": event["event_type"],
                "payload": event["payload"],
                "timestamp": timezone.now().isoformat(),
            }
        )

    async def presence_event(self, event):
        """Relay presence events (user.joined, user.left)"""
        await self.send_json(
            {
                "type": event["event_type"],
                "payload": event["payload"],
                "timestamp": timezone.now().isoformat(),
            }
        )
