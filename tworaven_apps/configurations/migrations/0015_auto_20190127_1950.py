# Generated by Django 2.1.5 on 2019-01-28 00:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('configurations', '0014_merge_20190126_1723'),
    ]

    operations = [
        migrations.AddField(
            model_name='d3mconfiguration',
            name='d3m_input_dir',
            field=models.TextField(blank=True, help_text='Added in 2019 config.', verbose_name='D3MINPUTDIR'),
        ),
        migrations.AlterField(
            model_name='d3mconfiguration',
            name='training_data_root',
            field=models.TextField(blank=True, help_text='Input: Path to the root directory of the dataset described by dataset_schema', verbose_name='input_root'),
        ),
    ]
