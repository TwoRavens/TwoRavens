# Generated by Django 2.0.5 on 2018-08-03 19:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eventdata_queries', '0013_auto_20180803_0142'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usernotificationmodel',
            name='created',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
