from django.conf import settings
from rest_framework.throttling import UserRateThrottle


class AIRateThrottle(UserRateThrottle):
    scope = "ai"

    def get_rate(self) -> str:
        return getattr(settings, "AI_RATE_LIMIT", "20/hour")
