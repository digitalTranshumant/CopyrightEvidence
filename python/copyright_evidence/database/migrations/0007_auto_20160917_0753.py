# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-09-17 07:53
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('database', '0006_auto_20160917_0751'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dataset',
            name='sample_size',
            field=models.IntegerField(help_text='Sample size of the dataset.', null=True),
        ),
    ]