from django.db import models

from model_utils.models import TimeStampedModel
import jsonfield

from tworaven_apps.raven_auth.models import User


class UserWorkspace(TimeStampedModel):

    user = models.ForeignKey(User,
                             on_delete=models.CASCADE)

    problem = models.TextField(('Type of problem identifier. e.g.'
                                ' value of the "D3MPROBLEMPATH"'),
                               blank=False)

    is_active = models.BooleanField('Is this workspace still usable?',
                                    default=True,)

    description = models.TextField('optional description', blank=True)

    def __str__(self):
        if not self.problem:
            return '%s - UNKOWN problem' % (self.user,)

        return '%s - %s...' % (self.user, self.problem[:10])

    class Meta:
        ordering = ('-is_active', 'modified', 'user')


class PreprocessInfo(TimeStampedModel):
    """Track profiled data based on a UserWorkspace"""
    workspace = models.ForeignKey(UserWorkspace,
                                  on_delete=models.CASCADE)

    is_success = models.BooleanField(default=False)

    preprocess_file = models.FileField(\
                    help_text='Preprocess file',
                    upload_to='preprocess/%Y/%m/%d/',
                    blank=True)

    preprocess_date = models.DateTimeField(blank=True,
                                           null=True)

    note = models.CharField('150-char short description',
                            max_length=150)

    description = models.TextField('optional description',
                                   blank=True)

    def __str__(self):
        if not self.problem:
            return '%s - UNKOWN problem' % (self.user,)

        return '%s - %s...' % (self.user, self.problem[:10])

    class Meta:
        ordering = ('workspace', '-preprocess_date', '-modified')
