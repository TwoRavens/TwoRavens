# Generated by Django 2.0.5 on 2018-07-03 06:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eventdata_queries', '0005_auto_20180702_1220'),
    ]

    operations = [
        migrations.AddField(
            model_name='archivequeryjob',
            name='datafile_id',
            field=models.IntegerField(default=1),
        ),
    ]
