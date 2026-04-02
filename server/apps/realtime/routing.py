from django.urls import re_path

from . import consumers
from .workspace_consumer import WorkspaceConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/board/(?P<board_id>[0-9a-f-]+)/$",
        consumers.BoardConsumer.as_asgi(),
    ),
    re_path(
        r"ws/workspace/(?P<workspace_slug>[\w-]+)/$",
        WorkspaceConsumer.as_asgi(),
    ),
]
