from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _get_user(token_str: str):
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import AccessToken

    User = get_user_model()
    try:
        token = AccessToken(token_str)
        return User.objects.get(id=token["user_id"])
    except Exception:
        return AnonymousUser()


class JWTQueryParamAuthMiddleware:
    """Authenticate WebSocket connections via ?token=<access_jwt> query param."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            query_string = scope.get("query_string", b"").decode()
            params = parse_qs(query_string)
            token_list = params.get("token", [])
            if token_list:
                scope["user"] = await _get_user(token_list[0])
            else:
                scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)
