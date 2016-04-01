# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rhizome', '0007_chart_to_dashboard'),
    ]

    operations = [
        migrations.CreateModel(
            name='IndicatorDataFormat',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('data_format', models.CharField(max_length=10)),
                ('indicator', models.ForeignKey(to='rhizome.Indicator')),
                ('location_type', models.ForeignKey(to='rhizome.LocationType')),
            ],
            options={
                'db_table': 'indicator_data_format',
            },
        ),
        migrations.AlterUniqueTogether(
            name='indicatordataformat',
            unique_together=set([('location_type', 'indicator')]),
        ),
    ]
