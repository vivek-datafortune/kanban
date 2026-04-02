"""
Seed script — run inside Docker:
  docker compose exec web python scripts/seed.py

Creates:
  - 5 users (+ keeps existing admin if present)
  - 4 workspaces, each with 4–5 boards
  - Each board has 5–8 lists, each list has 10–15 cards
  - Labels, due dates, start dates, descriptions, card members, activity logs
"""

import os
import sys
import django
from pathlib import Path

# ── Bootstrap Django ──────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

# ── Imports after setup ───────────────────────────────────────────────────────
import random
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.workspaces.models import Workspace, WorkspaceMembership
from apps.boards.models import Board, Label, List, Card, CardLabel, CardMember, Activity

User = get_user_model()

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def p(msg): print(f"  {msg}")

BOARD_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
    "#0ea5e9", "#a855f7", "#d946ef", "#fb923c", "#4ade80",
]

LABEL_SETS = [
    [("Bug", "#f43f5e"), ("Feature", "#6366f1"), ("Urgent", "#f97316"), ("Design", "#ec4899"), ("Backend", "#14b8a6")],
    [("High Priority", "#f43f5e"), ("Medium", "#eab308"), ("Low", "#22c55e"), ("Research", "#06b6d4"), ("Review", "#8b5cf6")],
    [("Frontend", "#3b82f6"), ("Backend", "#6366f1"), ("DevOps", "#f97316"), ("Testing", "#22c55e"), ("Docs", "#94a3b8")],
    [("Critical", "#f43f5e"), ("Enhancement", "#8b5cf6"), ("Chore", "#94a3b8"), ("Security", "#f97316"), ("Performance", "#14b8a6")],
]

CARD_DESCRIPTIONS = [
    "<p>Implement the core functionality as discussed in the design doc. Make sure to handle edge cases and add proper error handling.</p><ul><li>Write unit tests</li><li>Update API docs</li><li>PR review required</li></ul>",
    "<p>This task requires updating the existing implementation to support the new requirements from the product team.</p><blockquote>Note: Coordinate with the design team before starting.</blockquote>",
    "<p>Refactor the existing code to improve <strong>performance</strong> and <em>readability</em>. Target a 30% reduction in execution time.</p>",
    "<p>Investigate and fix the reported issue. Steps to reproduce:</p><ol><li>Open the settings page</li><li>Click on advanced options</li><li>Observe the error</li></ol>",
    "<p>Design and implement the new <strong>user onboarding flow</strong>. This includes welcome screens, tutorial tooltips, and first-run setup wizard.</p>",
    "<p>Set up monitoring and alerting for the production environment. Configure dashboards for:</p><ul><li>Response time p95/p99</li><li>Error rate</li><li>Database query performance</li></ul>",
    "<p>Write comprehensive documentation covering setup, configuration, and common use cases. Include code examples and diagrams.</p>",
    "<p>Conduct a thorough <strong>security audit</strong> of all API endpoints. Check for OWASP Top 10 vulnerabilities and remediate any findings.</p>",
    "<p>Implement caching layer using Redis to reduce database load. Expected improvement: <strong>60% fewer DB queries</strong> on the dashboard.</p>",
    "<p>Review and update all third-party dependencies to their latest stable versions. Run the full test suite after each upgrade.</p>",
    "",  # some cards intentionally left without description
    "",
]

# ─────────────────────────────────────────────────────────────────────────────
# Workspace / board / list data
# ─────────────────────────────────────────────────────────────────────────────
WORKSPACES = [
    {
        "name": "Acme Corp Engineering",
        "description": "Engineering workspace for Acme Corp — product, platform, and infrastructure teams.",
        "boards": [
            {"title": "Product Roadmap Q2 2026", "lists": ["Backlog", "In Design", "In Development", "In Review", "Done"]},
            {"title": "Platform Reliability", "lists": ["Reported", "Triaged", "In Progress", "Monitoring", "Resolved", "Closed"]},
            {"title": "Mobile App v3", "lists": ["Ideas", "Planned", "In Progress", "Testing", "Released"]},
            {"title": "Data Infrastructure", "lists": ["Backlog", "Scoping", "In Progress", "Blocked", "Completed"]},
            {"title": "Security & Compliance", "lists": ["Audit Items", "Remediation", "In Review", "Closed"]},
        ],
    },
    {
        "name": "Design Studio",
        "description": "Creative workspace for UI/UX design, brand, and research projects.",
        "boards": [
            {"title": "Brand Refresh 2026", "lists": ["Discovery", "Concepts", "Feedback", "Refinement", "Approved", "Delivered"]},
            {"title": "Design System v2", "lists": ["Components", "In Design", "In Review", "Published"]},
            {"title": "User Research", "lists": ["Planned", "Recruiting", "In Progress", "Analysis", "Insights"]},
            {"title": "Marketing Campaigns", "lists": ["Briefs", "In Progress", "Review", "Live", "Archive"]},
        ],
    },
    {
        "name": "Startup Horizon",
        "description": "All-hands workspace for our fast-growing startup. Move fast, break nothing.",
        "boards": [
            {"title": "MVP Launch Checklist", "lists": ["Not Started", "In Progress", "Blocked", "Done"]},
            {"title": "Investor Relations", "lists": ["Draft", "Pending", "Sent", "Follow-up", "Closed"]},
            {"title": "Customer Success", "lists": ["New Requests", "In Progress", "Escalated", "Resolved"]},
            {"title": "Growth & Marketing", "lists": ["Ideas", "Experimenting", "Measuring", "Scaling", "Discontinued"]},
            {"title": "Hiring Pipeline", "lists": ["Applied", "Phone Screen", "Interview", "Offer", "Hired", "Rejected"]},
        ],
    },
    {
        "name": "Open Source Projects",
        "description": "Workspace for managing open source contributions, releases, and community.",
        "boards": [
            {"title": "Core Library v4", "lists": ["Reported Issues", "Confirmed", "In Progress", "Review", "Merged", "Released"]},
            {"title": "Documentation", "lists": ["Needed", "Drafting", "Review", "Published"]},
            {"title": "Community & Events", "lists": ["Ideas", "Planning", "Announced", "Completed"]},
            {"title": "Plugin Ecosystem", "lists": ["Proposals", "Accepted", "Building", "Published"]},
        ],
    },
]

CARD_TITLE_POOLS = {
    # Generic pool — reused across all boards
    "generic": [
        "Set up CI/CD pipeline", "Write unit tests for auth module", "Fix memory leak in worker process",
        "Add pagination to list endpoint", "Migrate database to PostgreSQL 16",
        "Implement rate limiting", "Add dark mode support", "Optimize image loading",
        "Set up Sentry error tracking", "Configure Redis cache", "Write API documentation",
        "Add CSV export feature", "Implement search functionality", "Fix broken mobile layout",
        "Add two-factor authentication", "Reduce bundle size", "Set up staging environment",
        "Code review for PR #142", "Update onboarding flow", "Fix date timezone issues",
        "Add webhook support", "Implement audit logging", "Performance test the dashboard",
        "Update privacy policy", "Add keyboard shortcuts", "Create admin panel",
        "Fix login redirect bug", "Implement SSO with Google", "Add drag-and-drop support",
        "Write E2E tests with Playwright", "Upgrade Node.js to v22", "Add notifications service",
        "Design new card detail view", "Implement real-time updates", "Fix CORS configuration",
        "Add file upload support", "Refactor authentication service", "Set up monitoring dashboards",
        "Implement soft delete", "Add activity feed", "Create invitation system",
        "Fix session expiry handling", "Add custom domain support", "Improve error messages",
        "Set up load balancer", "Implement offline mode", "Add accessibility audit",
        "Create data backup strategy", "Implement feature flags", "Add multi-language support",
        "Fix email delivery issues", "Set up CDN for static assets",
    ],
}


def get_card_titles(n: int) -> list[str]:
    pool = CARD_TITLE_POOLS["generic"]
    if n <= len(pool):
        return random.sample(pool, n)
    # If more titles needed, add suffixes
    base = random.sample(pool, len(pool))
    extras = [f"{random.choice(pool)} (follow-up)" for _ in range(n - len(pool))]
    return (base + extras)[:n]


# ─────────────────────────────────────────────────────────────────────────────
# Main seed
# ─────────────────────────────────────────────────────────────────────────────
def seed():
    print("\n🌱  Starting seed...\n")

    # ── Primary owner — must already exist ───────────────────────────────────
    OWNER_EMAIL = "vivek.kumar@datafortune.com"
    try:
        owner = User.objects.get(email=OWNER_EMAIL)
        p(f"Owner: {owner.email} (id={owner.pk})")
    except User.DoesNotExist:
        print(f"❌  User '{OWNER_EMAIL}' not found. Cannot seed.")
        sys.exit(1)

    # ── Extra seed users (used as workspace members / card members only) ──────
    print("\n👤  Creating extra users...")
    user_data = [
        {"email": "alice@acme.io",   "first_name": "Alice",   "last_name": "Johnson",  "password": "seed1234"},
        {"email": "bob@acme.io",     "first_name": "Bob",     "last_name": "Williams", "password": "seed1234"},
        {"email": "carol@acme.io",   "first_name": "Carol",   "last_name": "Martinez", "password": "seed1234"},
        {"email": "david@acme.io",   "first_name": "David",   "last_name": "Chen",     "password": "seed1234"},
        {"email": "eve@acme.io",     "first_name": "Eve",     "last_name": "Patel",    "password": "seed1234"},
    ]
    extra_users = []
    for ud in user_data:
        user, created = User.objects.get_or_create(
            email=ud["email"],
            defaults={
                "first_name": ud["first_name"],
                "last_name":  ud["last_name"],
                "is_active":  True,
            },
        )
        if created:
            user.set_password(ud["password"])
            user.save()
            p(f"Created {user.email}")
        else:
            p(f"Exists  {user.email}")
        extra_users.append(user)

    now = timezone.now()

    # ── Clean up previously seeded workspaces so re-runs work cleanly ─────────
    seeded_names = [ws["name"] for ws in WORKSPACES]
    deleted_ws = Workspace.objects.filter(name__in=seeded_names).delete()
    if deleted_ws[0]:
        p(f"Cleaned up {deleted_ws[0]} old seeded records")

    # ── Workspaces & boards ───────────────────────────────────────────────────
    for ws_idx, ws_data in enumerate(WORKSPACES):
        print(f"\n🏢  Workspace: {ws_data['name']}")

        ws = Workspace.objects.create(
            name=ws_data["name"],
            description=ws_data["description"],
            created_by=owner,
        )
        p(f"Created workspace slug={ws.slug}")

        # owner membership
        WorkspaceMembership.objects.create(
            workspace=ws, user=owner, role=WorkspaceMembership.Role.OWNER
        )
        # add 3 extra users as members
        ws_members = random.sample(extra_users, min(3, len(extra_users)))
        for m in ws_members:
            role = WorkspaceMembership.Role.ADMIN if random.random() < 0.3 else WorkspaceMembership.Role.MEMBER
            WorkspaceMembership.objects.create(workspace=ws, user=m, role=role)
        all_ws_users = [owner] + ws_members

        # Labels per board — pick a label set
        label_set_data = LABEL_SETS[ws_idx % len(LABEL_SETS)]

        for b_idx, board_data in enumerate(ws_data["boards"]):
            color = BOARD_COLORS[(ws_idx * 5 + b_idx) % len(BOARD_COLORS)]
            board = Board.objects.create(
                workspace=ws,
                title=board_data["title"],
                background_color=color,
                visibility=Board.Visibility.WORKSPACE,
                created_by=owner,
            )
            p(f"  Board: {board.title}")

            # Labels
            labels = []
            for lname, lcolor in label_set_data:
                lbl = Label.objects.create(board=board, name=lname, color=lcolor)
                labels.append(lbl)

            # Lists & cards
            for l_idx, list_title in enumerate(board_data["lists"]):
                lst = List.objects.create(
                    board=board,
                    title=list_title,
                    position=float(l_idx + 1),
                )

                num_cards = random.randint(10, 15)
                card_titles = get_card_titles(num_cards)

                for c_idx, ctitle in enumerate(card_titles):
                    # Dates: ~60% of cards get a due date
                    due_date = None
                    start_date = None
                    if random.random() < 0.6:
                        delta_days = random.randint(-5, 30)
                        due_date = now + timedelta(days=delta_days)
                        if random.random() < 0.5:
                            start_date = due_date - timedelta(days=random.randint(1, 7))

                    card = Card.objects.create(
                        list=lst,
                        title=ctitle,
                        description=random.choice(CARD_DESCRIPTIONS),
                        position=float(c_idx + 1),
                        due_date=due_date,
                        start_date=start_date,
                        created_by=owner,
                    )

                    # Assign 0–2 labels
                    n_labels = random.randint(0, 2)
                    for lbl in random.sample(labels, min(n_labels, len(labels))):
                        CardLabel.objects.create(card=card, label=lbl)

                    # Assign 0–2 members
                    n_members = random.randint(0, 2)
                    for mu in random.sample(all_ws_users, min(n_members, len(all_ws_users))):
                        CardMember.objects.get_or_create(card=card, user=mu)

                    # Activity log
                    Activity.objects.create(
                        board=board,
                        card=card,
                        actor=card.created_by,
                        action="card.created",
                        details={"title": card.title, "list": lst.title},
                    )

            p(f"    → {len(board_data['lists'])} lists seeded for '{board.title}'")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n✅  Seed complete!")
    print(f"   Users:      {User.objects.count()}")
    print(f"   Workspaces: {Workspace.objects.count()}")
    print(f"   Boards:     {Board.objects.count()}")
    print(f"   Lists:      {List.objects.count()}")
    print(f"   Cards:      {Card.objects.count()}")
    print(f"   Labels:     {Label.objects.count()}")
    print(f"   Activities: {Activity.objects.count()}\n")


if __name__ == "__main__":
    seed()
