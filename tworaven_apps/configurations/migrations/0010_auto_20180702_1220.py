# Generated by Django 2.0.5 on 2018-07-02 16:20

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('configurations', '0009_d3mconfiguration_user_problems_root'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='d3mconfiguration',
            options={'ordering': ('-is_default', 'name', '-modified'), 'verbose_name': 'D3M Configuration', 'verbose_name_plural': 'D3M Configurations'},
        ),
    ]
