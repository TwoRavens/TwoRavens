# Generated by Django 2.1.11 on 2019-11-13 22:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('configurations', '0024_remove_d3mconfiguration_problem_root'),
    ]

    operations = [
        migrations.AddField(
            model_name='d3mconfiguration',
            name='is_selectable_dataset',
            field=models.BooleanField(default=True, help_text='The user may choose this datast from a list'),
        ),
    ]
