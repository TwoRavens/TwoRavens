from collections import OrderedDict
import hashlib

from django.db import models
from django.conf import settings
from django.urls import reverse
from django.utils.safestring import mark_safe

import jsonfield

from model_utils.models import TimeStampedModel
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.json_helper import json_dumps
from tworaven_apps.ta2_interfaces.static_vals import CALLBACK_URL, DETAILS_URL

STATUS_IN_PROGRESS = 'IN_PROGRESS'
STATUS_ERROR = 'ERROR'
STATUS_COMPLETE = 'COMPLETE'
STATUS_LIST = (STATUS_IN_PROGRESS,
               STATUS_ERROR, STATUS_COMPLETE)
REQUEST_STATUS_CHOICES = [(x, x) for x in STATUS_LIST]
RESPONSE_STATUS_CHOICES = [(x, x) for x in (STATUS_ERROR, STATUS_COMPLETE)]


class StoredRequest(TimeStampedModel):
    """For storing TA2 responses, especially streaming responses"""
    name = models.CharField(\
                    blank=True,
                    max_length=255,
                    help_text='auto-generated')

    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE)

    workspace = models.CharField(\
                    help_text='Used to identify this problem',
                    max_length=255)

    request_type = models.CharField(\
                        help_text='API request name',
                        max_length=255)

    status = models.CharField(\
                        max_length=255,
                        default=STATUS_IN_PROGRESS,
                        choices=REQUEST_STATUS_CHOICES)

    is_finished = models.BooleanField(default=False)

    pipeline_id = models.CharField(\
                        'Pipeline ID',
                        help_text='if applicable',
                        max_length=255,
                        blank=True)

    request = jsonfield.JSONField(\
                    help_text='JSON sent by user',
                    load_kwargs=dict(object_pairs_hook=OrderedDict))

    hash_id = models.CharField(help_text='Used for urls (auto-generated)',
                               max_length=255,
                               blank=True)

    user_message = models.CharField(help_text='Mainly for error messages',
                                    max_length=255,
                                    blank=True)

    def __str__(self):
        """reference name"""
        return self.name

    class Meta:
        """ordering, etc"""
        ordering = ('-created',)


    def save(self, *args, **kwargs):
        """Set a name if one isn't specified"""
        if not self.id:
            super(StoredRequest, self).save(*args, **kwargs)

        if not self.name:
            self.name = '(%s) %s' % \
                (self.id, self.request_type)

        if not self.hash_id:
            hash_str = '%s %s' % (self.id, self.created)
            self.hash_id = hashlib.sha224(hash_str.encode('utf-8')).hexdigest()

        if self.status in (STATUS_COMPLETE, STATUS_ERROR):
            self.is_finished = True
        else:
            self.is_finished = False

        super(StoredRequest, self).save(*args, **kwargs)

    def get_absolute_url(self):
        """for the admin"""
        return self.get_callback_url()

    def get_callback_url(self):
        """Callback url for returning "as_dict" info"""
        if not self.id:
            return None

        return reverse('view_stored_request',
                       kwargs=dict(hash_id=self.hash_id))

    @staticmethod
    def set_error_status(stored_request_id, user_message=None, is_finished=True):
        """Retrieve the StoredRequest, set the status and message"""
        try:
            stored_request = StoredRequest.objects.get(pk=stored_request_id)
        except StoredRequest.DoesNotExist:
            return err_resp('Failed to find Stored Request')

        stored_request.status = STATUS_ERROR
        stored_request.is_finished = is_finished
        if user_message:
            stored_request.user_message = user_message

        stored_request.save()

        return ok_resp(None)

    @staticmethod
    def set_finished_ok_status(stored_request_id, user_message=None):
        """Retrieve the StoredRequest, set the status and message"""
        try:
            stored_request = StoredRequest.objects.get(pk=stored_request_id)
        except StoredRequest.DoesNotExist:
            return err_resp('Failed to find Stored Request')

        stored_request.status = STATUS_COMPLETE
        stored_request.is_finished = True
        if user_message:
            stored_request.user_message = user_message
        else:
            stored_request.user_message = "Call completed successfully."

        stored_request.save()

        return ok_resp(None)

    def request_as_json(self):
        """Display OrderedDict as JSON"""
        if not self.request:
            return '(n/a)'

        json_info = json_dumps(self.request, indent=4)
        if json_info.success:
            json_str = '<pre>%s</pre>' % json_info.result_obj
        else:
            json_str = 'Error: %s' % json_info.err_msg

        return mark_safe(json_str)


    def as_dict(self, short_version=False):
        """Return info as a dict"""
        attr_names = ('id', 'name', 'hash_id',
                      'is_finished', 'status', 'user_message',
                      'workspace', 'request_type',
                      DETAILS_URL,
                      'request')

        od = OrderedDict()
        for val in attr_names:
            if val == 'is_finished':
                od[val] = self.is_finished
            elif val == DETAILS_URL:
                od[DETAILS_URL] = self.get_callback_url()
            else:
                od[val] = self.__dict__.get(val)
        od['created'] = self.created.isoformat()
        od['modified'] = self.modified.isoformat()

        if short_version:
            # used by StoredResponse.as_dict()
            return od

        # Iterate through the related StoredResponse objects
        #
        response_list = []
        unread_cnt = 0
        for resp in self.storedresponse_set.all():
            if not resp.sent_to_user:
                unread_cnt += 1
            response_list.append(resp.as_dict(short_version=True))

        od['responses'] = dict(count=len(response_list),
                               unread_count=unread_cnt,
                               list=response_list)

        return od

class StoredResponse(TimeStampedModel):
    """For storing TA2 responses, especially streaming responses"""
    stored_request = models.ForeignKey(StoredRequest,
                                       on_delete=models.CASCADE)

    is_success = models.BooleanField(default=True)

    sent_to_user = models.BooleanField(\
                        help_text='Sent to the UI for user viewing',
                        default=False)

    status = models.CharField(\
                        max_length=255,
                        default=STATUS_COMPLETE,
                        choices=RESPONSE_STATUS_CHOICES)

    response = jsonfield.JSONField(\
                    help_text='JSON received by the TA2',
                    load_kwargs=dict(object_pairs_hook=OrderedDict))

    hash_id = models.CharField(help_text='Used for urls (auto-generated)',
                               max_length=255,
                               blank=True)

    def save(self, *args, **kwargs):
        """Set a name if one isn't specified"""
        if not self.id:
            super(StoredResponse, self).save(*args, **kwargs)

        if not self.hash_id:
            hash_str = 'rsp-%s%s' % (self.id, self.created)
            self.hash_id = hashlib.sha224(hash_str.encode('utf-8')).hexdigest()

        super(StoredResponse, self).save(*args, **kwargs)

    class Meta:
        """ordering, etc"""
        ordering = ('-created',)

    def __str__(self):
        """reference name"""
        return '%s' % self.stored_request

    def get_absolute_url(self):
        """for the admin"""
        return self.get_callback_url()

    def get_callback_url(self):
        """Callback url for returning "as_dict" info"""
        if not self.id:
            return None

        return reverse('view_stored_response',
                       kwargs=dict(hash_id=self.hash_id))

    def link_to_request(self):
        """Admin link to request"""
        if not self.stored_request:
            return '(n/a)'

        url_str = '<a href="%s">view request</a>' % \
                  reverse('admin:ta2_interfaces_storedrequest_change',
                          args=(self.stored_request.id,))

        return mark_safe(url_str)

    def response_as_json(self):
        """Display OrderedDict as JSON"""
        if not self.response:
            return '(n/a)'

        json_info = json_dumps(self.response, indent=4)
        if json_info.success:
            json_str = '<pre>%s</pre>' % json_info.result_obj
        else:
            json_str = 'Error: %s' % json_info.err_msg

        return mark_safe(json_str)


    def as_dict(self, short_version=False):
        """Return info as a dict"""
        attr_names = ('id', 'hash_id', 'is_success',
                      'status', 'sent_to_user',
                      DETAILS_URL)

        od = OrderedDict()
        for val in attr_names:
            if val == 'is_success':
                od[val] = self.is_success
            elif val == DETAILS_URL:
                od[DETAILS_URL] = self.get_callback_url()
            else:
                od[val] = self.__dict__.get(val)
        od['created'] = self.created.isoformat()
        od['modified'] = self.modified.isoformat()

        if short_version:
            # used if part of StoredRequest.as_dict() list
            return od

        od['response'] = self.response
        od['stored_request'] = self.stored_request.as_dict(short_version=True)

        return od


    @staticmethod
    def mark_as_read(stored_response):
        """Mark the response as read"""
        assert isinstance(stored_response, StoredResponse), \
            'stored_response must be a StoredResponse instance'

        # Is 'sent_to_user' already set?
        if stored_response.sent_to_user is True:
            return False

        stored_response.sent_to_user = True
        stored_response.save()

        return True

    @staticmethod
    def add_response(stored_request_id, response):
        """Retrieve the StoredRequest, set the status and message"""
        try:
            stored_request = StoredRequest.objects.get(pk=stored_request_id)
        except StoredRequest.DoesNotExist:
            return err_resp('Failed to find Stored Request')

        stored_response = StoredResponse(\
                            stored_request=stored_request,
                            response=response)

        stored_response.save()

        return ok_resp(None)
