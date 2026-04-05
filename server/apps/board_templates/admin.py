from django.contrib import admin

from .models import BoardTemplate


@admin.register(BoardTemplate)
class BoardTemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "is_system", "use_count", "created_at")
    list_filter = ("category", "is_system")
    search_fields = ("title",)
    readonly_fields = ("id", "use_count", "created_at")
