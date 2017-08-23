from django.db import models

from django.utils.safestring import mark_safe
from model_utils.models import TimeStampedModel
from tworaven_apps.utils.json_helper import format_json_for_admin

# Create your models here.
ZELIG_APP = 'zelig'
DATA_APP = 'dataapp'

class TestCallCapture(TimeStampedModel):

    app_name = models.CharField(max_length=255)

    outgoing_url = models.URLField(blank=True)
    request = models.TextField(blank=True)

    response = models.TextField(blank=True)
    status_code = models.CharField(max_length=50, blank=True)
    success = models.BooleanField(default=False)

    def __str__(self):
        return '%s - (%s)' % (self.app_name, self.created)

    class Meta:
        ordering = ('-created',)

    def request_json(self):
        return format_json_for_admin(self.request)

    def response_json(self):
        return format_json_for_admin(self.response)
