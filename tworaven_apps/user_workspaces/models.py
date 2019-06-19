"""
NOTE: Make UserWorkspace objects and changes through
    tworaven_apps.user_workspaces.utils
"""
import hashlib
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

    is_public = models.BooleanField(\
                            default=False,
                            help_text='Share this workspace with others')

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

    original_workspace = models.ForeignKey('UserWorkspace',
                                           related_name='orig_workspace+',
                                           on_delete=models.CASCADE,
                                           blank=True,
                                           null=True)

    previous_workspace = models.ForeignKey('UserWorkspace',
                                           related_name='prev_workspace+',
                                           on_delete=models.CASCADE,
                                           blank=True,
                                           null=True)

    hash_id = models.CharField(help_text='(auto-generated)',
                               max_length=255,
                               blank=True)

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

            qs.update(is_current_workspace=False)

        self.format_name()

        if not self.hash_id:
            hash_str = '%s %s' % (self.id, self.created)
            self.hash_id = hashlib.sha224(hash_str.encode('utf-8')).hexdigest()


        super(UserWorkspace, self).save(*args, **kwargs)


    def is_original_workspace(self):
        """Is this the original workspace?"""
        if not self.id:
            return False

        if self.original_workspace and \
            self.id == self.original_workspace.id:
            return True

        return False

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

        return self.get_workspace_url_by_id(self.id, use_pretty)

        """
        ws_url = '%s' % \
                reverse('view_user_raven_config',
                        kwargs=dict(user_workspace_id=self.id))

        if use_pretty:
            ws_url = f'{ws_url}?pretty'

        return ws_url
        """

    def get_workspace_url_by_id(self, ws_id, use_pretty=False):
        """Basically the reverse for 'view_user_raven_config' """
        if not ws_id:
            return 'workspace id not specified! (get_workspace_url_by_id)'

        ws_url = '%s' % \
                reverse('view_user_raven_config',
                        kwargs=dict(user_workspace_id=ws_id))

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
        if not self.id:
            info_dict['message'] = ('Workspace is not yet saved.'
                                    ' API not available.')
            return info_dict

        info_dict['user_workspace_id'] = self.id
        info_dict['name'] = self.name
        info_dict['user_workspace_url'] = self.get_json_url()

        info_dict['is_original_workspace'] = self.is_original_workspace()
        info_dict['is_current_workspace'] = self.is_current_workspace
        info_dict['description'] = self.description


        sharing = OrderedDict()
        sharing['is_public'] = self.is_public
        if self.is_public:
            sharing['shared_workspace_url'] = \
                                    reverse('view_shared_workspace_by_hash_id',
                                            kwargs=dict(hash_id=self.hash_id))
        else:
            sharing['shared_workspace_url'] = None
        info_dict['sharing'] = sharing

        ws_history = OrderedDict()

        # ------------------------------
        # Previous workspace info
        # ------------------------------
        if self.previous_workspace:
            prev_ws_id = self.previous_workspace.id
            ws_history['previous_workspace_id'] = prev_ws_id
            ws_history['previous_workspace_url'] = self.get_workspace_url_by_id(\
                                                        prev_ws_id)
        else:
            ws_history['previous_workspace_id'] = None
            ws_history['previous_workspace_url'] = None

        # ------------------------------
        # Original workspace info
        # ------------------------------
        if self.original_workspace:
            orig_ws_id = self.original_workspace.id
            ws_history['original_workspace_id'] = orig_ws_id
            ws_history['original_workspace_url'] = self.get_workspace_url_by_id(\
                                                        orig_ws_id)
        else:
            ws_history['original_workspace_id'] = None
            ws_history['original_workspace_url'] = None


        info_dict['history'] = ws_history

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
