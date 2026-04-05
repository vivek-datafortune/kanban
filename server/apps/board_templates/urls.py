from django.urls import path

from . import views

urlpatterns = [
    path("templates/", views.BoardTemplateListCreateView.as_view(), name="template-list"),
    path("templates/<uuid:pk>/", views.BoardTemplateDetailView.as_view(), name="template-detail"),
    path(
        "boards/<uuid:pk>/save-as-template/",
        views.SaveAsTemplateView.as_view(),
        name="board-save-as-template",
    ),
    path(
        "templates/<uuid:pk>/use/",
        views.UseTemplateView.as_view(),
        name="template-use",
    ),
]
