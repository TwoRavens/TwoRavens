from collections import OrderedDict
from django.db import models
from model_utils.models import TimeStampedModel


class ActiveDatamartInfoManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)

class DatamartInfo(TimeStampedModel):
    """Name and connection url for a Datamart"""
    name = models.CharField(unique=True,
                            max_length=255)

    display_name = models.CharField(\
                                unique=True,
                                max_length=255)

    is_active = models.BooleanField(default=True)

    url = models.URLField(\
        help_text='example: https://datamart.d3m.vida-nyu.org')

    documentation_link = models.URLField(\
                        help_text='Link to documentation',
                        blank=True)

    description = models.TextField(help_text='optional', blank=True)

    objects = models.Manager()

    active_objects = ActiveDatamartInfoManager() # returns active DatamartInfo objects


    class Meta:
        verbose_name = 'Datamart Connection Information'
        verbose_name_plural = 'Datamart Connection Information'
        ordering = ('name', 'is_active')

    def __str__(self):
        """Return the name"""
        return self.name

    def save(self, *args, **kwargs):
        """Some checks on save"""
        if not self.display_name:
            self.display_name = self.name

        # remove the trailing slash
        #
        if self.url.endswith('/'):
            self.url = self.url[:-1]

        super(DatamartInfo, self).save(*args, **kwargs)

    def as_dict(self, **kwargs):
        """Convert to python dict"""
        if not self.id:
            return dict(message='DatamartInfo not saved')

        info_dict = OrderedDict()

        info_dict['id'] = self.id
        info_dict['name'] = self.name
        info_dict['display_name'] = self.display_name
        info_dict['is_active'] = self.is_active

        info_dict['url'] = self.url
        info_dict['documentation_link'] = self.documentation_link
        info_dict['description'] = self.description
        info_dict['modified'] = self.modified
        info_dict['created'] = self.created

        return info_dict
