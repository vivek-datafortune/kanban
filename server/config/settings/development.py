import socket

from .base import *  # noqa: F401, F403
from .base import INSTALLED_APPS, MIDDLEWARE, env  # noqa: F401

DEBUG = True

ALLOWED_HOSTS = ["*"]

# ── Debug toolbar ─────────────────────────────────────────────────────────────
INSTALLED_APPS += ["debug_toolbar"]
MIDDLEWARE.insert(1, "debug_toolbar.middleware.DebugToolbarMiddleware")

# Resolve Docker gateway IP so the toolbar renders inside containers
hostname, _, ips = socket.gethostbyname_ex(socket.gethostname())
INTERNAL_IPS = [ip[: ip.rfind(".")] + ".1" for ip in ips] + ["127.0.0.1"]

# ── Dev-friendly overrides ────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True  # allow any origin in development

ACCOUNT_EMAIL_VERIFICATION = "none"  # skip email confirmation in dev
