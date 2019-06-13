from collections import OrderedDict
import json
from django.db import models
from django.conf import settings

import jsonfield

from model_utils.models import TimeStampedModel

from tworaven_apps.behavioral_logs import static_vals as bl_static


class BehavioralLogEntry(TimeStampedModel):
    """For recording behavioral logs"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE,
                             blank=True,
                             null=True)

    session_key = models.CharField(max_length=255,
                                   blank=True,
                                   help_text='optional')

    is_optional = models.BooleanField(default=False)

    feature_id = models.CharField(\
                        max_length=255,
                        blank=True,
                        help_text=('Auto-filled on save. A unique'
                                   ' identifier'
                                   ' of the system component'))

    type = models.CharField(max_length=100,
                            choices=bl_static.ENTRY_TYPE_CHOICES)

    path = models.CharField(max_length=255,
                            blank=True,
                            help_text=('May be used for recording Datamart'
                                       ' paths or similar'))
    activity_l1 = models.CharField(\
                        max_length=255,
                        choices=bl_static.L1_ACTIVITY_CHOICES,
                        help_text='"activity_l1" in spec')

    activity_l2 = models.CharField(\
                        max_length=255,
                        default=bl_static.L2_ACTIVITY_BLANK,
                        help_text='"activity_l2" in spec')

    other = jsonfield.JSONField(\
                blank=True,
                help_text='Additional info',
                load_kwargs=dict(object_pairs_hook=OrderedDict))


    class Meta:
        ordering = ('-created',)
        verbose_name_plural = 'Behavioral log entries'


    def __str__(self):
        """str repr"""
        if self.feature_id:
            return f'{self.feature_id}'

        return f'{self.type}, {self.activity_l1}, {self.activity_l2}'


    def save(self, *args, **kwargs):
        """For any auto-created fields"""
        if not self.id:
            super(BehavioralLogEntry, self).save(*args, **kwargs)

        if not self.feature_id:
            self.feature_id = self.construct_feature_id()

        if not self.other:
            self.other = self.format_other_entry()
        #if not self.hash_id:
        #    hash_str = '%s %s' % (self.id, self.created)
        #    self.hash_id = hashlib.sha224(hash_str.encode('utf-8')).hexdigest()

        super(BehavioralLogEntry, self).save(*args, **kwargs)

    def other_to_string(self):
        """Format other as a JSON string"""
        if not self.other:
            return json.dumps(self.other)

        return json.dumps(self.other)

    def format_other_entry(self):
        """The "other entry", a bit TBD"""
        if self.other:
            info = self.other
        else:
            info = {}

        if self.id and self.session_key:
            info.update(dict(id=self.id,
                             session_key=self.session_key))
        elif self.id:
            info.update(dict(id=self.id))

        return info


    def to_dict(self, **kwargs):
        """Convert to python dict"""
        if not self.id:
            return dict(message='BehavioralLogEntry not saved')

        info_dict = OrderedDict()

        info_dict['id'] = self.id
        info_dict['user'] = self.user.username
        info_dict['session_key'] = self.session_key
        info_dict['is_optional'] = self.is_optional

        info_dict['type'] = self.type
        info_dict['feature_id'] = self.feature_id
        info_dict['activity_l1'] = self.activity_l1
        info_dict['activity_l2'] = self.activity_l2
        info_dict['path'] = self.path
        info_dict['other'] = self.other

        info_dict['modified'] = self.modified
        info_dict['created'] = self.created

        return info_dict

    def construct_feature_id(self):
        """Construct feature id
        reference: https://docs.google.com/document/d/1oCDxLdXjACGRe6q_TJcG7ewroGsE5UwJRMV_HEIZ7w8/edit#heading=h.rb0vqkdmt0p"""

        """
        - If type is TA23API, this is the name of the call.
        - If DATAMART, request type and path.
        - If type is SYSTEM, then a  unique identifier of the system component.
        """
        if not self.type:
            return '(type must be set)'

        # TA23API
        #
        if self.type == bl_static.ENTRY_TYPE_TA23API:
            return 'Error should be name of TA23API call)'
            # bl_static.ENTRY_TYPE_TA23API

        # DATAMART
        #
        if self.type == bl_static.ENTRY_TYPE_DATAMART:
            return (f'{self.type}||'
                    f'{self.path if self.path else "(not captured)"}')

        # SYSTEM
        #
        if self.type == bl_static.ENTRY_TYPE_SYSTEM:
            return (f'{self.type}||{self.activity_l1}'
                    f'||{self.activity_l2}')

        # This is actually an error
        return bl_static.ENTRY_TYPE_UNKNOWN
