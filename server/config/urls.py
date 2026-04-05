from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from apps.users.urls import social_urlpatterns
from apps.workspaces.views import InvitationAcceptView

urlpatterns = [
    path("admin/", admin.site.urls),
    # dj-rest-auth: login, logout, password reset / change, user detail
    path("api/auth/", include("dj_rest_auth.urls")),
    # dj-rest-auth registration + email confirmation
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    # Microsoft OAuth endpoints
    path("api/auth/", include(social_urlpatterns)),
    # Custom user profile endpoint
    path("api/users/", include("apps.users.urls")),
    # Workspaces
    path("api/workspaces/", include("apps.workspaces.urls")),
    # Boards, lists, cards
    path("api/", include("apps.boards.urls")),
    # Invitation accept (top-level — invitee doesn't know the workspace slug)
    path("api/invitations/accept/", InvitationAcceptView.as_view(), name="invitation-accept"),
    # Notifications
    path("api/notifications/", include("apps.notifications.urls")),
    # AI features
    path("api/", include("apps.ai.urls")),
    # Board templates
    path("api/", include("apps.board_templates.urls")),
]

if settings.DEBUG:
    import debug_toolbar

    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]

