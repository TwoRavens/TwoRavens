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

    name = models.CharField(\
                            max_length=255,
                            blank=True,
                            help_text='Auto-filled if a ravens-config exists')

    orig_dataset_id = models.CharField(\
                        max_length=255,
                        help_text='From D3MConfiguration orig_dataset_id')

    d3m_config = models.ForeignKey(D3MConfiguration,
                                   on_delete=models.CASCADE)

    raven_config = jsonfield.JSONField(\
                        blank=True,
                        help_text='JSON data for the frontend',
                        load_kwargs=dict(object_pairs_hook=OrderedDict))

    slug = models.SlugField(blank=True,
                            help_text='auto-filled on save')

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

            # Make sure all other workspaces are not current
            #
            qs = UserWorkspace.objects.exclude(id=self.id)
            #.filter(orig_dataset_id=self.orig_dataset_id)
            qs.update(is_current_workspace=False)

        self.format_name()

        super(UserWorkspace, self).save(*args, **kwargs)

    def format_name(self):
        """Format the workspace name"""
        # Is there a raven's config?
        # Yes, then use the name there
        #
        if self.raven_config:
            try:
                self.name = self.raven_config['name']
            except KeyError:
                pass

        # Has a name been set?  (raven_config or user set)
        #  No? Then add a default
        #
        if not self.name:
            self.name = f'{self.d3m_config}'


    def get_absolute_url(self):
        """url for info in JSON format"""
        return self.get_json_url(self, use_pretty=True)


    def get_json_url(self, use_pretty=False):
        """url for info in JSON format"""
        if not self.id:
            return 'UserWorkspace not yet saved'

        ws_url = '%s' % \
                reverse('view_user_raven_config',
                        kwargs=dict(user_workspace_id=self.id))

        if use_pretty:
            ws_url = f'{ws_url}?pretty'

        return ws_url


    def to_dict_summary(self):
        """Return a summary: name, id, etc"""
        return self.to_dict(**dict(summary_only=True))

    def to_dict(self, **kwargs):
        """This version embeds the D3M config info
        Option to request "summary_only"
        """
        summary_only = kwargs.get('summary_only', False)

        info_dict = OrderedDict()

        info_dict['user_workspace_id'] = self.id
        info_dict['name'] = self.name
        info_dict['user_workspace_url'] = self.get_json_url()
        info_dict['is_current_workspace'] = self.is_current_workspace
        info_dict['description'] = self.description
        info_dict['orig_dataset_id'] = self.orig_dataset_id

        info_dict['modified'] = self.modified
        info_dict['created'] = self.created

        # Return only a summary
        if summary_only:
            return info_dict

        info_dict['d3m_config'] = self.d3m_config.to_dict()

        if not self.raven_config:
            info_dict['raven_config'] = None
        else:
            info_dict['raven_config'] = self.raven_config

        return info_dict
