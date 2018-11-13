# Generated by Django 2.0.8 on 2018-11-08 19:43

from django.db import migrations
import jsonfield.fields


class Migration(migrations.Migration):

    dependencies = [
        ('ta2_interfaces', '0006_auto_20180809_1101'),
    ]

    operations = [
        migrations.AddField(
            model_name='storedresponse',
            name='additionalInfo',
            field=jsonfield.fields.JSONField(blank=True, help_text='Extra JSON added to response. For example, associated scoreIds. {scoreIds: []}'),
        ),
    ]
