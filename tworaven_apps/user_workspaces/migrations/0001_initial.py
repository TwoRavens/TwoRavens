# Generated by Django 2.1.3 on 2019-01-22 21:24

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import model_utils.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PreprocessInfo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, editable=False, verbose_name='created')),
                ('modified', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, editable=False, verbose_name='modified')),
                ('is_success', models.BooleanField(default=False)),
                ('preprocess_file', models.FileField(blank=True, help_text='Preprocess file', upload_to='preprocess/%Y/%m/%d/')),
                ('preprocess_date', models.DateTimeField(blank=True, null=True)),
                ('note', models.CharField(max_length=150, verbose_name='150-char short description')),
                ('description', models.TextField(blank=True, verbose_name='optional description')),
            ],
            options={
                'ordering': ('workspace', '-preprocess_date', '-modified'),
            },
        ),
        migrations.CreateModel(
            name='UserWorkspace',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', model_utils.fields.AutoCreatedField(default=django.utils.timezone.now, editable=False, verbose_name='created')),
                ('modified', model_utils.fields.AutoLastModifiedField(default=django.utils.timezone.now, editable=False, verbose_name='modified')),
                ('problem', models.TextField(verbose_name='Type of problem identifier. e.g. value of the "D3MPROBLEMPATH"')),
                ('is_active', models.BooleanField(default=True, verbose_name='Is this workspace still usable?')),
                ('description', models.TextField(blank=True, verbose_name='optional description')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-is_active', 'modified', 'user'),
            },
        ),
        migrations.AddField(
            model_name='preprocessinfo',
            name='workspace',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='user_workspaces.UserWorkspace'),
        ),
    ]