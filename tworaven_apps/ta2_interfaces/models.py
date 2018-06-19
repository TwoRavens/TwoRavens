from collections import OrderedDict
import hashlib

from django.db import models
from django.conf import settings

import jsonfield

from model_utils.models import TimeStampedModel


STATUS_SENT = 'SENT'
STATUS_IN_PROGRESS = 'IN_PROGRESS'
STATUS_ERROR = 'ERROR'
STATUS_COMPLETE = 'COMPLETE'
STATUS_LIST = (STATUS_SENT, STATUS_IN_PROGRESS,
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

    hash = models.CharField(help_text='Used for urls (auto-generated)',
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

        if not self.hash:
            hash_str = '%s %s' % (self.id, self.created)
            self.hash = hashlib.sha224(hash_str).hexdigest()

        if self.status in (STATUS_COMPLETE, STATUS_ERROR):
            self.is_finished = False
        else:
            self.is_finished = True

        super(StoredRequest, self).save(*args, **kwargs)


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
                        choices=RESPONSE_STATUS_CHOICES)

    response = jsonfield.JSONField(\
                    help_text='JSON received by the TA2',
                    load_kwargs=dict(object_pairs_hook=OrderedDict))

    hash = models.CharField(help_text='Used for urls (auto-generated)',
                            max_length=255,
                            blank=True)

    def save(self, *args, **kwargs):
        """Set a name if one isn't specified"""
        if not self.id:
            super(StoredResponse, self).save(*args, **kwargs)

        if not self.hash:
            hash_str = 'rsp-%s%s' % (self.id, self.created)
            self.hash = hashlib.sha224(hash_str).hexdigest()

        super(StoredResponse, self).save(*args, **kwargs)

    @staticmethod
    def mark_as_read(stored_response):
        """Mark the response as read"""
        pass
