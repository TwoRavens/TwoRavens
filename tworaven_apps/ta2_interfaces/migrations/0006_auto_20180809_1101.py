# Generated by Django 2.0.5 on 2018-08-09 15:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ta2_interfaces', '0005_storedrequest_user_message'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='storedresponse',
            name='is_success',
        ),
        migrations.AddField(
            model_name='storedresponse',
            name='is_finished',
            field=models.BooleanField(default=False),
        ),
    ]