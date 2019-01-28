from django.db import models

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

    is_active = models.BooleanField('Is this workspace still usable?',
                                    default=True,)

    description = models.TextField('optional description', blank=True)

    def __str__(self):

        return '%s - %s...' % (self.user, self.d3m_config)

    class Meta:
        ordering = ('-is_active', 'modified', 'user')
