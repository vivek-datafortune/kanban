from django.contrib import admin

from .models import Board, Card, CardLabel, CardMember, ChecklistItem, Label, List, StarredBoard


class ListInline(admin.TabularInline):
    model = List
    extra = 0


class LabelInline(admin.TabularInline):
    model = Label
    extra = 0


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("title", "workspace", "visibility", "created_by", "created_at")
    list_filter = ("visibility",)
    search_fields = ("title",)
    inlines = [LabelInline, ListInline]


@admin.register(List)
class ListAdmin(admin.ModelAdmin):
    list_display = ("title", "board", "position", "is_archived")


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ("title", "list", "position", "due_date")
    search_fields = ("title",)


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "board")


admin.site.register(StarredBoard)
admin.site.register(CardLabel)
admin.site.register(CardMember)
admin.site.register(ChecklistItem)
