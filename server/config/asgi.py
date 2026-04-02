import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Initialize Django ASGI application early to populate the app registry
django_asgi_app = get_asgi_application()

# Import after Django app registry is populated
from apps.realtime.middleware import JWTQueryParamAuthMiddleware  # noqa: E402
from apps.realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTQueryParamAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        ),
    }
)
