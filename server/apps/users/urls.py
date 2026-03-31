from django.urls import path

from .social_views import GoogleAuthURL, GoogleLogin, MicrosoftAuthURL, MicrosoftLogin
from .views import UserProfileView

urlpatterns = [
    path("me/", UserProfileView.as_view(), name="user-profile"),
]

# Social auth endpoints (mounted at /api/auth/ from config/urls.py)
social_urlpatterns = [
    path("microsoft/", MicrosoftLogin.as_view(), name="microsoft-login"),
    path("microsoft/url/", MicrosoftAuthURL.as_view(), name="microsoft-auth-url"),
    path("google/", GoogleLogin.as_view(), name="google-login"),
    path("google/url/", GoogleAuthURL.as_view(), name="google-auth-url"),
]
