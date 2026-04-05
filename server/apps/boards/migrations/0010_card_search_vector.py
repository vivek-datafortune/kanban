from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("boards", "0009_saved_filter"),
    ]

    operations = [
        migrations.AddField(
            model_name="card",
            name="search_vector",
            field=SearchVectorField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="card",
            index=GinIndex(fields=["search_vector"], name="card_search_vector_idx"),
        ),
    ]
