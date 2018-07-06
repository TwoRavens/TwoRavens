from django.db import models
import json, jsonfield
import decimal
from django.db import models
from django.urls import reverse
from django.conf import settings
from django.utils.text import slugify
from django.db import transaction

from collections import OrderedDict
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)
from django.db.models import Q
# For the prototype, set the current schema for now...
from model_utils.models import TimeStampedModel

IN_PROCESS = u'PENDING'
ERROR = u'FAILURE'
COMPLETE = u'SUCCESS'
STATUS_STATES = (IN_PROCESS, ERROR, COMPLETE)
SUBSET = u'subset'
AGGREGATE = u'aggregate'
TYPE_OPTIONS = ( SUBSET, AGGREGATE)
TYPE_CHOICES = [(x,x) for x in TYPE_OPTIONS]
STATUS_CHOICES = [(x, x) for x in STATUS_STATES]
# Create your models here.

NAME = u'name'
DESC = u'description'
USERNAME = u'username'

SEARCH_PARAMETERS = (NAME, DESC, USERNAME)


class EventDataSavedQuery(TimeStampedModel):
    """ Model to store queries"""
    name = models.CharField(blank=False,
                            max_length=255)
    description = models.TextField(blank=True)
    username = models.CharField(blank=False,
                                max_length=255)
    query = jsonfield.JSONField(default=None,
                                blank=False,
                                load_kwargs=dict(object_pairs_hook=OrderedDict))

    result_count = models.IntegerField(default=-1)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now_add=True)
    saved_to_dataverse = models.BooleanField(default=False)
    dataverse_url = models.URLField(blank=True)
    dataset = models.TextField(blank=True)
    dataset_type = models.CharField(blank=False,
                                    max_length=255,
                                    choices=TYPE_CHOICES,
                                    default=SUBSET)

    class Meta:
        ordering = ('-created',)

    def __str__(self):
        query_str = json.dumps(self.query, indent=4)
        return str(query_str)

    def get_query_id(self):
        """return id"""
        if self.id:
            return self.id

        return None

    def save(self, *args, **kwargs):

        super(EventDataSavedQuery, self).save(*args, **kwargs)

    def as_dict(self):
        """return info dict"""
        od = OrderedDict()

        for attr_name in self.__dict__.keys():

            # check for attributes to skip...
            if attr_name.startswith('_'):
                continue

            val = self.__dict__[attr_name]
            if isinstance(val, models.fields.files.FieldFile):
                # this is a file field...
                #
                val = str(val)  # file path or empty string
                if val == '':
                    val = None
                od[attr_name] = val
            else:
                od[attr_name] = val


        return od

    def get_all_objects(self):
        """return all objects"""
        result = EventDataSavedQuery.objects.all()

        if not result:
            return err_resp('could not get the object list as %s' % result)
        else:
            return ok_resp(result)

    def get_objects_by_id(self, job_id):
        """return object by id"""
        result = EventDataSavedQuery.objects.filter(id=job_id).first()

        if not result:
            return err_resp('could not get the object for id %s' % job_id)

        else:
            return ok_resp(result)

    def get_filtered_objects(self, **kwargs):
        """get all the filtered objects"""
        arguments = {}
        for k, v in kwargs.items():
            if v:
                arguments[k] = v

        result = EventDataSavedQuery.objects.values('name', 'username', 'description','result_count',
                                                    'created', 'modified', 'saved_to_dataverse',
                                                    'dataverse_url', 'dataset', 'dataset_type'
                                                    ).filter(**arguments).all()

        if not result:
            return err_resp('could not get the object for the inputs')

        else:
            return ok_resp(result)

    def get_all_fields_except_query_list(self):
        """ get all fields expect query"""
        result = EventDataSavedQuery.objects.values('name', 'username', 'description',
                                                    'result_count', 'created', 'modified', 'saved_to_dataverse',
                                                    'dataverse_url', 'dataset', 'dataset_type', 'id').all()

        if not result:
            return err_resp('could not get the object list')

        else:
            return ok_resp(result)


class ArchiveQueryJob(TimeStampedModel):
    """archive query job"""
    datafile_id = models.IntegerField(default=1)
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
    dataverse_response = jsonfield.JSONField(blank=True,
                                             load_kwargs=dict(object_pairs_hook=OrderedDict))
    archive_url = models.URLField(blank=True)

    class Meta:
        ordering = ('-created',)

    def get_archive_id(self):
        """return id"""
        if self.id:
            return self.id

        return None

    def get_datafile_id(self):
        """return datafile id"""

        if self.datafile_id:
            return self.datafile_id

        return None

    def save(self, *args, **kwargs):

        super(ArchiveQueryJob, self).save(*args, **kwargs)

    def as_dict(self):
        """return info dict"""
        od = OrderedDict()

        for attr_name in self.__dict__.keys():

            # check for attributes to skip...
            if attr_name.startswith('_'):
                continue

            val = self.__dict__[attr_name]
            if isinstance(val, models.fields.files.FieldFile):
                # this is a file field...
                #
                val = str(val)  # file path or empty string
                if val == '':
                    val = None
                od[attr_name] = val
            else:
                od[attr_name] = val


        return od

    def get_all_objects(self):
        """return all objects"""
        result = ArchiveQueryJob.objects.all()

        if not result:
            return err_resp('could not get the object list as %s' % result)
        else:
            return ok_resp(result)

    def get_objects_by_id(self, datafile_id):
        """return object by id"""
        result = ArchiveQueryJob.objects.filter(datafile_id=datafile_id).first()

        if not result:
            return err_resp('could not get the object for id %s' % datafile_id)

        else:
            return ok_resp(result)

    def get_filtered_objects(self, **kwargs):
        """get all the filtered objects"""
        arguments = {}
        for k, v in kwargs.items():
            if v:
                arguments[k] = v

        result = ArchiveQueryJob.objects.filter(**arguments).all()

        if not result:
            return err_resp('could not get the object for the inputs')

        else:
            return ok_resp(result)

