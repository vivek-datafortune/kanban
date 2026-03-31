from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string


def send_invitation_email(invitation):
    """Send a workspace invitation email."""
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    invite_link = f"{frontend_url}/invite/{invitation.token}"

    context = {
        "workspace_name": invitation.workspace.name,
        "inviter_name": (
            invitation.invited_by.get_full_name()
            or invitation.invited_by.email
        ),
        "role": invitation.get_role_display(),
        "invite_link": invite_link,
    }

    html_body = render_to_string("workspaces/invitation_email.html", context)
    plain_body = (
        f"You've been invited to join '{context['workspace_name']}' "
        f"as {context['role']} by {context['inviter_name']}.\n\n"
        f"Accept the invitation: {invite_link}\n\n"
        f"This link expires in 7 days."
    )

    send_mail(
        subject=f"You're invited to join {context['workspace_name']}",
        message=plain_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[invitation.email],
        html_message=html_body,
    )
