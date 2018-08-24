"""
Models for saving EventData queries
"""
import json, jsonfield
import decimal
import hashlib
from collections import OrderedDict
from datetime import datetime

from django.db import models
from django.urls import reverse
from django.conf import settings
from django.utils.text import slugify
from django.db import transaction
from django.db.models import Q
from django.utils.timesince import timesince as timesince_

from model_utils.models import TimeStampedModel

from tworaven_apps.raven_auth.models import User
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)


IN_PROCESS = u'PENDING'
ERROR = u'FAILURE'
COMPLETE = u'SUCCESS'
STATUS_STATES = (IN_PROCESS, ERROR, COMPLETE)
SUBSET = u'subset'
AGGREGATE = u'aggregate'
TYPE_OPTIONS = (SUBSET, AGGREGATE)
TYPE_CHOICES = [(x, x) for x in TYPE_OPTIONS]
STATUS_CHOICES = [(x, x) for x in STATUS_STATES]
METHOD_CHOICES = (u'find', u'aggregate', u'count')  # the valid mongodb collection methods
HOST_CHOICES = (u'TwoRavens', 'UTDallas')

# Create your models here.
SEARCH_KEY_NAME = u'name'
SEARCH_KEY_DESCRIPTION = u'description'
#SEARCH_KEY_USERNAME = u'username'

SEARCH_PARAMETERS = (SEARCH_KEY_NAME,
                     SEARCH_KEY_DESCRIPTION,)   # USERNAME)


class EventDataSavedQuery(TimeStampedModel):
    """ Model to store queries"""
    name = models.CharField(blank=False,
                            max_length=255)

    description = models.TextField(blank=True)

    user = models.ForeignKey(User,
                             db_index=True,
                             on_delete=models.PROTECT)

    query = jsonfield.JSONField(blank=False,
                                load_kwargs=dict(object_pairs_hook=OrderedDict))

    result_count = models.IntegerField(default=-1)

    collection_type = models.CharField(blank=False,
                                       max_length=255,
                                       choices=TYPE_CHOICES,
                                       default=SUBSET)

    collection_name = models.CharField(blank=False,
                                       max_length=255,
                                       default="mongo dataset")

    save_to_dataverse = models.BooleanField(blank=True,
                                            default=False)


    hash_id = models.CharField(help_text='(auto-generated)',
                               max_length=255,
                               blank=True)


    class Meta:
        """order by creation date"""
        ordering = ('-created',)
        verbose_name_plural = 'Event data saved queries'

    def __str__(self):
        """object repr"""
        # query_str = json.dumps(self.query, indent=4)
        return self.name

    def get_query_id(self):
        """return id"""
        if self.id:
            return self.id

        return None


    def save(self, *args, **kwargs):
        """For any auto-created fields"""
        if not self.id:
            super(EventDataSavedQuery, self).save(*args, **kwargs)

        if not self.hash_id:
            hash_str = '%s %s' % (self.id, self.created)
            self.hash_id = hashlib.sha224(hash_str.encode('utf-8')).hexdigest()

        super(EventDataSavedQuery, self).save(*args, **kwargs)

    def as_dict(self):
        """return info dict"""
        od = OrderedDict()

        for attr_name in self.__dict__.keys():

            # check for attributes to skip...
            if attr_name.startswith('_') or attr_name == 'query':
                continue

            val = self.__dict__[attr_name]
            if isinstance(val, models.fields.files.FieldFile):
                # this is a file field...
                #
                val = str(val)  # file path or empty string
                if not val:
                    val = None
                od[attr_name] = val
            else:
                od[attr_name] = val

        od['query'] = self.query

        return od

    @staticmethod
    def get_all_objects():
        """return all objects"""
        result = EventDataSavedQuery.objects.all()

        if not result:
            return err_resp('could not get the object list as %s' % result)
        else:
            return ok_resp(result)

    @staticmethod
    def get_objects_by_id(job_id):
        """return object by id"""
        result = EventDataSavedQuery.objects.filter(id=job_id).first()

        if not result:
            return err_resp('could not get the object for id %s' % job_id)

        else:
            return ok_resp(result)

    @staticmethod
    def get_field_list_for_values():
        """List of fields used for a queryset 'values' function"""
        return ['id', 'name', 'user__username',
                'description', 'result_count',
                'collection_name', 'collection_type',
                'hash_id',
                'created', 'modified',]


    def get_filtered_objects(self, **kwargs):
        """get all the filtered objects"""
        arguments = {}
        for k, v in kwargs.items():
            if v:
                arguments[k] = v

        result = EventDataSavedQuery.objects.values(\
                      *EventDataSavedQuery.get_field_list_for_values()\
                     ).filter(**arguments).all()

        if result.count() == 0:
            return err_resp('could not get the object for the inputs')

        return ok_resp(result)


    @staticmethod
    def get_query_list_for_user(user, **additional_filters):
        """ get all fields expect query"""
        if not isinstance(user, User):
            user_msg = 'A user must be specified.'
            return err_resp(user_msg)

        if not user.is_active:
            user_msg = 'The user is no longer active.'
            return err_resp(user_msg)

        orig_list = EventDataSavedQuery.objects.filter(\
                     user=user\
                    )
        if additional_filters:
            orig_list = orig_list.filter(**additional_filters)

        orig_list = orig_list.values(\
                        *EventDataSavedQuery.get_field_list_for_values())

        if orig_list.count() == 0:
            err_msg = ('No saved queries found.')
            return err_resp(err_msg)

        # Format the list including adding a detail url
        #
        fmt_list = []
        for item in orig_list:
            item['username'] = item['user__username']
            del item['user__username']
            item['detail_url'] = reverse('api_retrieve_event_data_query',
                                         kwargs=dict(query_id=item['id']))
            fmt_list.append(item)

        final_results = OrderedDict()
        final_results['count'] = len(fmt_list)
        final_results['query_list'] = fmt_list

        return ok_resp(final_results)


    def queries_to_dataverse(self):
        """ get list of all the queries to be saved to dataverse"""
        result = EventDataSavedQuery.objects.filter(save_to_dataverse=True)

        if result.count() == 0:
            user_msg = ('No EventDataSavedQuery objects found that'
                        ' have been saved to Dataverse')
            return err_resp(user_msg)

        return ok_resp(result)



class ArchiveQueryJob(TimeStampedModel):
    """archive query job"""
    datafile_id = models.IntegerField(\
                        "Datverse file id",
                        default=-1,
                        unique=True)

    saved_query = models.ForeignKey(EventDataSavedQuery,
                                    on_delete=models.PROTECT)

    status = models.CharField(max_length=100,
                              choices=STATUS_CHOICES,
                              default=IN_PROCESS)

    is_finished = models.BooleanField(default=False)

    is_success = models.BooleanField(default=False)

    message = models.TextField(default=None)

    dataverse_response = jsonfield.JSONField(\
                            blank=True,
                            load_kwargs=dict(object_pairs_hook=OrderedDict))

    archive_url = models.URLField(blank=True)

    hash_id = models.CharField(help_text='(auto-generated)',
                               max_length=255,
                               blank=True)

    class Meta:
        ordering = ('-created',)

    def __str__(self):
        return '%s' % self.saved_query

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

        if not self.id:
            super(ArchiveQueryJob, self).save(*args, **kwargs)

        if not self.hash_id:
            hash_str = '%s %s' % (self.id, self.created)
            self.hash_id = hashlib.sha224(hash_str.encode('utf-8')).hexdigest()

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
                if not val:
                    val = None
                od[attr_name] = val
            else:
                od[attr_name] = val


        return od

    @staticmethod
    def get_all_objects():
        """return all objects"""
        result = ArchiveQueryJob.objects.all()

        if result.count() == 0:
            user_msg = 'No ArchiveQueryJob objects found in the database.'
            return err_resp(user_msg)

        return ok_resp(result)

    @staticmethod
    def get_objects_by_id(datafile_id):
        """return object by id"""
        result = ArchiveQueryJob.objects.filter(datafile_id=datafile_id).first()

        if not result:
            user_msg = 'No ArchiveQueryJob for Datafile id: %s' % datafile_id
            return err_resp(user_msg)

        return ok_resp(result)


    def get_filtered_objects(self, **kwargs):
        """get all the filtered objects"""
        arguments = {}
        for k, v in kwargs.items():
            if v:
                arguments[k] = v

        result = ArchiveQueryJob.objects.filter(**arguments).all()

        if result.count() == 0:
            user_msg = 'No ArchiveQueryJob objects found for this query'
            return err_resp(user_msg)

        else:
            return ok_resp(result)


class UserNotification(TimeStampedModel):
    """"it is to store all the notifications sent to user"""

    recipient = models.ForeignKey(User,
                                  on_delete=models.CASCADE)

    unread = models.BooleanField(default=True,
                                 db_index=True)

    emailed = models.BooleanField(default=False, db_index=True)

    message = models.TextField()

    is_read = models.BooleanField(default=False)

    archived_query = jsonfield.JSONField(\
                        blank=False,
                        load_kwargs=dict(object_pairs_hook=OrderedDict))

    hash_id = models.CharField(help_text='(auto-generated)',
                               max_length=255,
                               blank=True)
    class Meta:
        ordering = ('-created',)

    def __str__(self):
        return '%s' % self.user.username


    def timesince(self, current_time=None):
        """
        src: https://github.com/django-notifications/django-notifications/blob/master/notifications/models.py
        Shortcut for the ``django.utils.timesince.timesince`` function of the
        current timestamp.
        """
        if now is None:
            current_time = datetime.now()
        return timesince_(self.created, current_time)


    def save(self, *args, **kwargs):
        """Create auto-populated fields"""
        if not self.id:
            super(UserNotification, self).save(*args, **kwargs)

        if not self.hash_id:
            hash_str = '%s %s' % (self.id, self.created)
            self.hash_id = hashlib.sha224(hash_str.encode('utf-8')).hexdigest()

        super(UserNotification, self).save(*args, **kwargs)

    def as_dict(self):
        """convert into orederd dict"""

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
                if not val:
                    val = None
                od[attr_name] = val
            else:
                od[attr_name] = val

        return od

    @staticmethod
    def get_all_objects():
        """return all objects"""
        result = UserNotification.objects.all()

        if result.count() == 0:
            return err_resp('No UserNotification results found')
        else:
            return ok_resp(result)


    @staticmethod
    def get_objects_by_id(user_key):
        """return object by id"""
        result = UserNotification.objects.filter(user=user_key).all()

        if not result:
            return err_resp('could not get the object for id %s' % user_key)

        else:
            return ok_resp(result)
