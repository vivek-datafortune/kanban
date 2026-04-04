from django.urls import path

from .views import (
    AcceptSuggestionView,
    CardAISuggestionView,
    DismissSuggestionView,
    GenerateChecklistView,
    GenerateDescriptionView,
    GenerateSuggestionsView,
)

urlpatterns = [
    path("ai/describe/", GenerateDescriptionView.as_view(), name="ai-describe"),
    path("ai/checklist/", GenerateChecklistView.as_view(), name="ai-checklist"),
    path("ai/suggest/", GenerateSuggestionsView.as_view(), name="ai-suggest"),
    path(
        "cards/<uuid:pk>/ai-suggestions/",
        CardAISuggestionView.as_view(),
        name="card-ai-suggestions",
    ),
    path(
        "ai-suggestions/<uuid:pk>/accept/",
        AcceptSuggestionView.as_view(),
        name="ai-suggestion-accept",
    ),
    path(
        "ai-suggestions/<uuid:pk>/dismiss/",
        DismissSuggestionView.as_view(),
        name="ai-suggestion-dismiss",
    ),
]
