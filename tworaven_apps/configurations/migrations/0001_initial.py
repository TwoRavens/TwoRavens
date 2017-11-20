# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-10-24 20:39
from __future__ import unicode_literals

from django.db import migrations, models
import django.utils.timezone
import model_utils.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AppConfiguration',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, editable=False, verbose_name='created')),
                ('modified', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, editable=False, verbose_name='modified')),
                ('name', models.CharField(help_text='e.g. "Dev Configuration"', max_length=255, unique=True)),
                ('is_active', models.BooleanField(default=False, help_text='Make this the active configuration. Once saved, any other configurations will be deactivated--but may be reused')),
                ('production', models.BooleanField(help_text='.js variable "production". True -> data, metadata from live server resources instead of local versions', verbose_name='Production')),
                ('d3m_mode', models.BooleanField(help_text='.js variable "d3m". Are D3M services active?', verbose_name='D3M mode')),
                ('d3m_url', models.CharField(default='/d3m-service/', help_text='URL used to make calls that are converted to gRPC messages and sent to D3M applications', max_length=255, verbose_name='D3M url')),
                ('privacy_mode', models.BooleanField(help_text='.js variable "privacy". Is the PSI tool available?', verbose_name='Privacy (PSI) mode')),
                ('rook_svc_url', models.CharField(default='/rook-custom/', help_text='URL to the rook server. examples: https://beta.dataverse.org/custom/, http://127.0.0.1:8080/rook-custom/', max_length=255, verbose_name='rappURL (rook apps)')),
                ('dataverse_url', models.URLField(help_text='URL to Dataverseexamples: https://beta.dataverse.org,https://dataverse.harvard.edu', verbose_name='dataverse url')),
                ('description', models.TextField(blank=True, help_text='optional')),
            ],
            options={
                'verbose_name': 'Two Ravens UI Configuration',
                'verbose_name_plural': 'Two Ravens UI Configurations',
                'db_table': 'tworavens_config',
                'ordering': ('-is_active',),
            },
        ),
        migrations.CreateModel(
            name='D3MConfiguration',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, editable=False, verbose_name='created')),
                ('modified', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, editable=False, verbose_name='modified')),
                ('name', models.CharField(help_text='for internal use', max_length=255, unique=True)),
                ('is_default', models.BooleanField(default=False, help_text='There can be either one default or no defaults')),
                ('dataset_schema', models.TextField(help_text='Input: Path to the dataset schema')),
                ('problem_schema', models.TextField(help_text='Input: Path to the problem schema')),
                ('training_data_root', models.TextField(help_text='Input: Path to the root directory of the dataset described by dataset_schema')),
                ('executables_root', models.TextField(blank=True, help_text='Output: Directory in which to write the Test Executables.')),
                ('pipeline_logs_root', models.TextField(blank=True, help_text='Output: Path at which performers should write the pipeline list, output described in Section 4.1.3')),
                ('temp_storage_root', models.TextField(blank=True, help_text='Temporary storage root for performers to use.')),
                ('slug', models.SlugField(blank=True, help_text='auto-filled on save')),
            ],
            options={
                'verbose_name': 'D3M Configuration',
                'verbose_name_plural': 'D3M Configurations',
                'ordering': ('name', '-modified'),
            },
        ),
    ]
