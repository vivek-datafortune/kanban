from django.core.management.base import BaseCommand

from apps.board_templates.models import BoardTemplate

SYSTEM_TEMPLATES = [
    {
        "title": "Software Sprint",
        "description": "A standard Scrum sprint board for engineering teams. Track backlog, active development, review, and completion.",
        "category": "engineering",
        "data": {
            "labels": [
                {"name": "Bug", "color": "#ef4444"},
                {"name": "Feature", "color": "#22c55e"},
                {"name": "Chore", "color": "#6366f1"},
                {"name": "Blocked", "color": "#f97316"},
            ],
            "lists": [
                {
                    "title": "Backlog",
                    "position": 1024,
                    "cards": [
                        {
                            "title": "Define acceptance criteria for upcoming sprint",
                            "description": "Work with the product team to write clear acceptance criteria.",
                            "labels": ["Feature"],
                            "checklist": [],
                        },
                        {
                            "title": "Review open bugs from last sprint",
                            "description": "Go through unresolved bugs and prioritize for this sprint.",
                            "labels": ["Bug"],
                            "checklist": [],
                        },
                    ],
                },
                {
                    "title": "In Progress",
                    "position": 2048,
                    "cards": [
                        {
                            "title": "Example task — move me to Done when complete",
                            "description": "",
                            "labels": [],
                            "checklist": [
                                {"text": "Write unit tests"},
                                {"text": "Code review"},
                                {"text": "Update documentation"},
                            ],
                        }
                    ],
                },
                {
                    "title": "In Review",
                    "position": 3072,
                    "cards": [],
                },
                {
                    "title": "Done",
                    "position": 4096,
                    "cards": [],
                },
            ],
        },
    },
    {
        "title": "Bug Tracker",
        "description": "Track bugs from report to resolution. Triage, fix, and verify issues systematically.",
        "category": "engineering",
        "data": {
            "labels": [
                {"name": "P0 - Critical", "color": "#dc2626"},
                {"name": "P1 - High", "color": "#f97316"},
                {"name": "P2 - Medium", "color": "#eab308"},
                {"name": "P3 - Low", "color": "#6366f1"},
            ],
            "lists": [
                {
                    "title": "Reported",
                    "position": 1024,
                    "cards": [
                        {
                            "title": "Login page crashes on mobile Safari",
                            "description": "User reported that the login page freezes on iOS Safari 17. Needs reproduction.",
                            "labels": ["P1 - High"],
                            "checklist": [
                                {"text": "Reproduce the issue"},
                                {"text": "Identify root cause"},
                            ],
                        }
                    ],
                },
                {
                    "title": "Triaged",
                    "position": 2048,
                    "cards": [],
                },
                {
                    "title": "In Fix",
                    "position": 3072,
                    "cards": [],
                },
                {
                    "title": "Resolved",
                    "position": 4096,
                    "cards": [],
                },
            ],
        },
    },
    {
        "title": "Product Roadmap",
        "description": "Plan and track features from idea to shipped. Align your product team on priorities.",
        "category": "product",
        "data": {
            "labels": [
                {"name": "Q1", "color": "#22c55e"},
                {"name": "Q2", "color": "#3b82f6"},
                {"name": "Q3", "color": "#f59e0b"},
                {"name": "Q4", "color": "#8b5cf6"},
            ],
            "lists": [
                {
                    "title": "Ideas",
                    "position": 1024,
                    "cards": [
                        {
                            "title": "User-defined dashboard widgets",
                            "description": "Let users customize their dashboard with drag-and-drop widgets.",
                            "labels": ["Q3"],
                            "checklist": [],
                        }
                    ],
                },
                {
                    "title": "Planned",
                    "position": 2048,
                    "cards": [],
                },
                {
                    "title": "In Development",
                    "position": 3072,
                    "cards": [],
                },
                {
                    "title": "Shipped",
                    "position": 4096,
                    "cards": [],
                },
            ],
        },
    },
    {
        "title": "Content Calendar",
        "description": "Plan, write, edit, and publish content. Great for blogs, social media, and marketing campaigns.",
        "category": "marketing",
        "data": {
            "labels": [
                {"name": "Blog Post", "color": "#3b82f6"},
                {"name": "Social Media", "color": "#ec4899"},
                {"name": "Email", "color": "#f59e0b"},
                {"name": "Video", "color": "#ef4444"},
            ],
            "lists": [
                {
                    "title": "Ideas",
                    "position": 1024,
                    "cards": [
                        {
                            "title": "10 tips for remote team productivity",
                            "description": "A listicle targeting remote-first teams.",
                            "labels": ["Blog Post"],
                            "checklist": [
                                {"text": "Research competitors"},
                                {"text": "Draft outline"},
                            ],
                        }
                    ],
                },
                {
                    "title": "Writing",
                    "position": 2048,
                    "cards": [],
                },
                {
                    "title": "Editing",
                    "position": 3072,
                    "cards": [],
                },
                {
                    "title": "Published",
                    "position": 4096,
                    "cards": [],
                },
            ],
        },
    },
    {
        "title": "Design Review",
        "description": "Manage design work from brief to approval. Track wireframes, mockups, and feedback rounds.",
        "category": "design",
        "data": {
            "labels": [
                {"name": "UI", "color": "#8b5cf6"},
                {"name": "UX", "color": "#06b6d4"},
                {"name": "Brand", "color": "#f97316"},
                {"name": "Needs Revision", "color": "#ef4444"},
            ],
            "lists": [
                {
                    "title": "Brief",
                    "position": 1024,
                    "cards": [
                        {
                            "title": "Onboarding flow redesign",
                            "description": "Redesign the 3-step onboarding flow to improve completion rates.",
                            "labels": ["UX"],
                            "checklist": [
                                {"text": "Gather stakeholder requirements"},
                                {"text": "Review analytics data"},
                            ],
                        }
                    ],
                },
                {
                    "title": "Wireframes",
                    "position": 2048,
                    "cards": [],
                },
                {
                    "title": "Mockups",
                    "position": 3072,
                    "cards": [],
                },
                {
                    "title": "Approved",
                    "position": 4096,
                    "cards": [],
                },
            ],
        },
    },
    {
        "title": "Onboarding Checklist",
        "description": "A structured onboarding workflow for new team members. Track progress through orientation tasks.",
        "category": "hr",
        "data": {
            "labels": [
                {"name": "Admin", "color": "#6366f1"},
                {"name": "Technical", "color": "#22c55e"},
                {"name": "Culture", "color": "#f59e0b"},
            ],
            "lists": [
                {
                    "title": "To Do",
                    "position": 1024,
                    "cards": [
                        {
                            "title": "Set up accounts (email, Slack, GitHub)",
                            "description": "Ensure the new hire has access to all required tools and services.",
                            "labels": ["Admin"],
                            "checklist": [
                                {"text": "Create email account"},
                                {"text": "Add to Slack workspace"},
                                {"text": "Grant GitHub access"},
                            ],
                        },
                        {
                            "title": "Schedule 1:1s with team members",
                            "description": "Calendar invites for intro meetings with direct collaborators.",
                            "labels": ["Culture"],
                            "checklist": [],
                        },
                        {
                            "title": "Complete security & compliance training",
                            "description": "Mandatory security awareness and compliance modules.",
                            "labels": ["Admin"],
                            "checklist": [
                                {"text": "Security awareness module"},
                                {"text": "Data privacy training"},
                            ],
                        },
                    ],
                },
                {
                    "title": "In Progress",
                    "position": 2048,
                    "cards": [],
                },
                {
                    "title": "Complete",
                    "position": 3072,
                    "cards": [],
                },
            ],
        },
    },
]


class Command(BaseCommand):
    help = "Seed system board templates (idempotent — safe to re-run)"

    def handle(self, *args, **options):
        created_count = 0
        for tmpl in SYSTEM_TEMPLATES:
            _, created = BoardTemplate.objects.get_or_create(
                title=tmpl["title"],
                is_system=True,
                defaults={
                    "description": tmpl["description"],
                    "category": tmpl["category"],
                    "data": tmpl["data"],
                    "created_by": None,
                    "workspace": None,
                },
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {created_count} template(s) created, "
                f"{len(SYSTEM_TEMPLATES) - created_count} already existed."
            )
        )
