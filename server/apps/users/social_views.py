import logging
from urllib.parse import urlencode

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


# ── Microsoft ────────────────────────────────────────────────────────────────

class SocialLoginSerializerWithTokenFlag(SocialLoginView.serializer_class):
    """dj-rest-auth exchanges the authorization code for tokens itself (over TLS)
    but never sets ``adapter.did_fetch_access_token``.  Without the flag allauth
    tries to verify the id_token signature by fetching remote JWKS, which can
    fail in containerised environments.  Per the OpenID-Connect Core spec,
    signature verification MAY be skipped when the token was obtained directly
    from the token endpoint over TLS."""

    def get_social_login(self, adapter, app, token, response):
        adapter.did_fetch_access_token = True
        return super().get_social_login(adapter, app, token, response)


class MicrosoftLogin(SocialLoginView):
    adapter_class = MicrosoftGraphOAuth2Adapter
    callback_url = f"{settings.FRONTEND_URL}/auth/callback?provider=microsoft"
    client_class = OAuth2Client
    permission_classes = [AllowAny]
    serializer_class = SocialLoginSerializerWithTokenFlag


class MicrosoftAuthURL(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = settings.SOCIALACCOUNT_PROVIDERS["microsoft"]["APPS"][0]["client_id"]
        tenant = settings.SOCIALACCOUNT_PROVIDERS["microsoft"]["APPS"][0]["settings"]["tenant"]
        scope = " ".join(settings.SOCIALACCOUNT_PROVIDERS["microsoft"]["SCOPE"])
        callback_url = f"{settings.FRONTEND_URL}/auth/callback?provider=microsoft"

        params = {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": callback_url,
            "response_mode": "query",
            "scope": scope,
        }

        auth_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?{urlencode(params)}"
        return Response({"authorization_url": auth_url})


# ── Google ───────────────────────────────────────────────────────────────────

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = f"{settings.FRONTEND_URL}/auth/callback?provider=google"
    client_class = OAuth2Client
    permission_classes = [AllowAny]
    serializer_class = SocialLoginSerializerWithTokenFlag


class GoogleAuthURL(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = settings.SOCIALACCOUNT_PROVIDERS["google"]["APPS"][0]["client_id"]
        scope = " ".join(settings.SOCIALACCOUNT_PROVIDERS["google"]["SCOPE"])
        callback_url = f"{settings.FRONTEND_URL}/auth/callback?provider=google"

        params = {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": callback_url,
            "scope": scope,
            "access_type": "online",
        }

        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        return Response({"authorization_url": auth_url})
