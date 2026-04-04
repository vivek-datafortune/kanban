from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """Private per-user WebSocket channel for real-time notification delivery."""

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.group_name = f"user_{user.pk}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content):
        pass  # client never sends anything on this channel

    async def notification_event(self, event):
        await self.send_json({
            "type": event["event_type"],
            "payload": event["payload"],
            "timestamp": timezone.now().isoformat(),
        })
