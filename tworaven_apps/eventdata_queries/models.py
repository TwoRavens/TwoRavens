from django.db import models
import json, jsonfield
import decimal
from django.db import models
from django.urls import reverse
from django.conf import settings
from django.utils.text import slugify
from django.db import transaction

from collections import OrderedDict
# For the prototype, set the current schema for now...
from model_utils.models import TimeStampedModel

IN_PROCESS = u'PENDING'
ERROR = u'FAILURE'
COMPLETE = u'SUCCESS'
STATUS_STATES = (IN_PROCESS, ERROR, COMPLETE)

STATUS_CHOICES = [(x, x) for x in STATUS_STATES]
# Create your models here.


class EventDataSavedQuery(TimeStampedModel):
    """ Model to store queries"""
    name = models.CharField(blank=False,
                            max_length=255)
    description = models.TextField(default=None)
    username = models.CharField(blank=False,
                                max_length=255)
    query = jsonfield.JSONField(default=None,
                                blank=False,
                                load_kwargs=dict(object_pairs_hook=OrderedDict))

    result_count = models.IntegerField(default=-1)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now_add=True)
    saved_to_dataverse = models.BooleanField(default=False)
    dataverse_url = models.URLField(default=None)


class ArchiveQueryJob(TimeStampedModel):
    """archive query job"""

    what = models.TextField(default=None)
    saved_query = models.ForeignKey(EventDataSavedQuery,
                                    on_delete=models.PROTECT)
    status = models.CharField(max_length=100,
                             choices=STATUS_CHOICES,
                             default=IN_PROCESS)
    is_finished = models.BooleanField(default=False)
    is_success = models.BooleanField(default=False)
    message = models.TextField(default=None)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now_add=True)
