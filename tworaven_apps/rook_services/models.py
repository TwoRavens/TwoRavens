from django.db import models

from django.utils.safestring import mark_safe
from model_utils.models import TimeStampedModel
from tworaven_apps.utils.json_helper import format_json_for_admin

# Create your models here.
ZELIG_APP = 'zelig'
DATA_APP = 'dataapp'

class TestCallCapture(TimeStampedModel):

    app_name = models.CharField(max_length=255)

    session_id = models.CharField(max_length=255,
                                  blank=True,
                                  db_index=True,
                                  help_text='Used for grouping calls together')

    outgoing_url = models.URLField(blank=True)
    request = models.TextField(blank=True)

    response = models.TextField(blank=True)
    status_code = models.CharField(max_length=50, blank=True)
    success = models.BooleanField(default=False)

    def __str__(self):
        return '%s - (%s)' % (self.app_name, self.created)

    class Meta:
        ordering = ('-created',)
        verbose_name = 'Rook Call Request'
        verbose_name_plural = 'Rook Call Requests'

    def request_json(self):
        return format_json_for_admin(self.request)

    def response_json(self):
        return format_json_for_admin(self.response)

    def add_error_message(self, msg, status_code='n/a'):
        """Shortcut to populate fields for a failed response"""
        self.success = True
        self.response = msg
        self.status_code = status_code

    def add_success_message(self, msg, status_code=200):
        """Shortcut to populate fields for a successful response"""
        self.success = True
        self.response = msg
        self.status_code = status_code
