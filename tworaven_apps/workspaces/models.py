"""First pass at saving TwoRaven states"""
from collections import OrderedDict
from datetime import datetime as dt

from model_utils.models import TimeStampedModel
import jsonfield

from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify

from tworaven_apps.utils.json_helper import format_jsonfield_for_admin,\
    format_link_for_admin


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

    class Meta:
        ordering = ('name',)

    def source_link(self):
        if not self.source_url:
            return 'n/a'

        return format_link_for_admin(self.source_url)


class SavedWorkspace(TimeStampedModel):

    name = models.CharField(max_length=255,
                            blank=True)

    user = models.ForeignKey(User,
                             blank=True,
                             null=True)

    data_source_type = models.ForeignKey(DataSourceType)

    workspace = jsonfield.JSONField(\
                    load_kwargs=dict(object_pairs_hook=OrderedDict))

    data_origin = jsonfield.JSONField(\
                    load_kwargs=dict(object_pairs_hook=OrderedDict))

    notes = models.TextField(blank=True)

    is_anonymous = models.BooleanField(default=True)

    # version = models.
    # is_deprecated

    def __str__(self):
        """String representation for admin"""
        if self.user:
            return 'ws %s - %s' % (self.username, self.modified)

        return 'ws %s' % (self.modified)


    def save(self, *args, **kwargs):
        """Update attributes based on state"""
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


    def data_origin_json(self):
        if not self.data_origin:
            return 'n/a'

        return format_jsonfield_for_admin(self.data_origin)

    def workspace_json(self):
        if not self.workspace:
            return 'n/a'

        return format_jsonfield_for_admin(self.workspace)
