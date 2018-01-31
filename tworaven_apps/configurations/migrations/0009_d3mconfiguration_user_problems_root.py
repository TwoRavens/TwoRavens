# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2018-01-31 19:36
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('configurations', '0008_auto_20171220_1136'),
    ]

    operations = [
        migrations.AddField(
            model_name='d3mconfiguration',
            name='user_problems_root',
            field=models.TextField(blank=True, help_text='Directory in which to write user - (or system-) generated problems for the part of TA(3+2) that involves generating additional problems.'),
        ),
    ]
