"""
NOTE: Make UserWorkspace objects and changes through
    tworaven_apps.user_workspaces.utils
"""
from collections import OrderedDict

from django.db import models
from django.urls import reverse
from django.db import transaction

from model_utils.models import TimeStampedModel
import jsonfield

from tworaven_apps.raven_auth.models import User
from tworaven_apps.configurations.models_d3m import D3MConfiguration

class UserWorkspace(TimeStampedModel):

    user = models.ForeignKey(User,
                             on_delete=models.CASCADE)

    orig_dataset_id = models.CharField(\
                        max_length=255,
                        help_text='From D3MConfiguration orig_dataset_id')

    d3m_config = models.ForeignKey(D3MConfiguration,
                                   on_delete=models.CASCADE)

    is_current_workspace = models.BooleanField(\
                                default=False,
                                help_text='Workspace that the user is using')

    is_active = models.BooleanField('Is this workspace still usable?',
                                    default=True,)

    description = models.TextField('optional description', blank=True)

    def __str__(self):

        return '%s - %s...' % (self.user, self.d3m_config)

    class Meta:
        ordering = ('user', '-is_current_workspace', '-id', '-is_active')

    @transaction.atomic
    def save(self, *args, **kwargs):
        """Some checks on save"""
        # Cannot be inactive and current
        #
        if not self.is_active:
            self.is_current_workspace = False

        # If this workspace is current,
        # change other workspaces NOT to be current
        #
        if self.is_current_workspace:
            if not self.id:
                super(UserWorkspace, self).save(*args, **kwargs)

            # Make sure other workspaces are not current
            #
            qs = UserWorkspace.objects.exclude(id=self.id\
                        ).filter(d3m_config=self.d3m_config,
                                 orig_dataset_id=self.orig_dataset_id)
            qs.update(is_current_workspace=False)

        super(UserWorkspace, self).save(*args, **kwargs)

    def get_absolute_url(self):
        """url for info in JSON format"""
        if not self.id:
            return 'UserWorkspace not yet saved'

        ws_url = '%s?pretty' % \
                reverse('view_user_workspace_config',
                        kwargs=dict(user_workspace_id=self.id))

        return ws_url

    def to_dict(self):
        """Convert to dict for API calls"""
        info_dict = self.d3m_config.to_dict()
        info_dict['user_workspace_id'] = self.id
        info_dict['is_current_workspace'] = self.is_current_workspace

        info_dict.move_to_end('is_current_workspace', last=False)
        info_dict.move_to_end('user_workspace_id', last=False)

        return info_dict
