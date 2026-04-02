from .models import Activity


def log_activity(*, board, actor, action, card=None, details=None):
    """Create an activity log entry."""
    return Activity.objects.create(
        board=board,
        card=card,
        actor=actor,
        action=action,
        details=details or {},
    )
