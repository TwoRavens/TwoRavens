# Generated by Django 2.1.5 on 2019-01-28 03:31

from django.db import migrations
import jsonfield.fields


class Migration(migrations.Migration):

    dependencies = [
        ('configurations', '0017_d3mconfiguration_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='d3mconfiguration',
            name='env_values',
            field=jsonfield.fields.JSONField(blank=True, help_text='D3M env values for running Docker TA2s'),
        ),
    ]
