"""First pass at saving TwoRaven states"""
from collections import OrderedDict
from datetime import datetime as dt
import json

from model_utils.models import TimeStampedModel
import jsonfield

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from tworaven_apps.configurations.models import AppConfiguration,\
    APP_DOMAINS
from tworaven_apps.utils.json_helper import format_jsonfield_for_admin,\
    format_link_for_admin

# keys in UI requests
UI_KEY_ZPARAMS = 'zparams'
UI_KEY_ALLNODES = 'allnodes'
UI_KEY_APP_DOMAIN = 'app_domain'
UI_KEY_DOMAIN_IDENTIFIER = 'domain_identifier'
UI_KEY_LIST = [UI_KEY_ZPARAMS, UI_KEY_ALLNODES]#, UI_KEY_APP_DOMAIN]

# session keys
SESSION_KEY_ZPARAMS = 'raven_ZPARAMS'
SESSION_KEY_ALLNODES = 'raven_ALLNODES'

UI_SESSION_DICT = {UI_KEY_ZPARAMS: SESSION_KEY_ZPARAMS,
                   UI_KEY_ALLNODES: SESSION_KEY_ALLNODES}

SESSION_KEY_LIST = [SESSION_KEY_ZPARAMS, SESSION_KEY_ALLNODES]


class DataSourceType(TimeStampedModel):

    name = models.CharField(max_length=255,
                            unique=True)

    is_active = models.BooleanField(default=True)

    source_url = models.URLField(blank=True)

    slug = models.SlugField(blank=True)

    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Set the slug on save"""
        self.slug = slugify(self.name)
        super(DataSourceType, self).save(*args, **kwargs)

    def as_json(self):
        """Return as an OrderedDict"""
        od = OrderedDict()

        params = ['id', 'name', 'is_active', 'slug',
                  'source_url', 'description',
                  'created', 'modified']
        for param in params:
            od[param] = self.__dict__.get(param)

        return od

    class Meta:
        ordering = ('name',)

    def source_link(self):
        if not self.source_url:
            return 'n/a'

        return format_link_for_admin(self.source_url)


class SavedWorkspace(TimeStampedModel):

    name = models.CharField(max_length=255,
                            blank=True)

    session_key = models.CharField(max_length=255)

    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             blank=True,
                             null=True)

    app_domain = models.CharField(max_length=100,
                                  choices=APP_DOMAINS)

    data_source_type = models.ForeignKey(DataSourceType,
                                         null=True,
                                         blank=True)

    zparams = jsonfield.JSONField(\
                    load_kwargs=dict(object_pairs_hook=OrderedDict))

    allnodes = jsonfield.JSONField(\
                    load_kwargs=dict(object_pairs_hook=OrderedDict))

    notes = models.TextField(blank=True)

    is_anonymous = models.BooleanField(default=True)

    # version = models.
    # is_deprecated

    def __str__(self):
        """String representation for admin"""
        if self.user:
            return 'ws %s - %s' % (self.user, self.modified)

        return 'ws %s' % (self.modified)


    def save(self, *args, **kwargs):
        """Update attributes based on state"""
        assert AppConfiguration.is_valid_app_domain(self.app_domain), \
               'The app_domain is invalid: %s' % self.app_domain

        if self.user:
            self.is_anonymous = False
        else:
            self.is_anonymous = True

        if not self.name:
            if self.user:
                self.name = '%s %s' % (self.user.username, dt.now())
            else:
                self.name = 'Anonymous %s' % (dt.now())

        super(SavedWorkspace, self).save(*args, **kwargs)


    class Meta:
        ordering = ('-modified',)
        unique_together = ('session_key', 'data_source_type')

    def as_json(self):
        """Return as an OrderedDict"""
        od = OrderedDict()

        params = ['id', 'name',
                  'session_key', 'user', 'is_anonymous',
                  'app_domain', 'data_source_type',
                  'zparams', 'allnodes',
                  'notes',
                  'created', 'modified']
        for param in params:
            if param == 'data_source_type':
                od[param] = self.data_source_type.as_json()
            elif param == 'user':
                od[param] = self.user.as_json()
            else:
                od[param] = self.__dict__.get(param)

        return json.dumps(od)

    def allnodes_json(self):
        if not self.allnodes:
            return 'n/a'

        return format_jsonfield_for_admin(self.allnodes)

    def zparams_json(self):
        if not self.zparams:
            return 'n/a'

        return format_jsonfield_for_admin(self.zparams)
