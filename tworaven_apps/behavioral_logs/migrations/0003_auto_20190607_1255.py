# Generated by Django 2.1.7 on 2019-06-07 16:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('behavioral_logs', '0002_behaviorallogentry_is_optional'),
    ]

    operations = [
        migrations.AlterField(
            model_name='behaviorallogentry',
            name='activity_l1',
            field=models.CharField(choices=[('DATA_PREPARATION', 'DATA_PREPARATION'), ('PROBLEM_DEFINITION', 'PROBLEM_DEFINITION'), ('MODEL_SELECTION', 'MODEL_SELECTION')], help_text='"activity_l1" in spec', max_length=255),
        ),
    ]
