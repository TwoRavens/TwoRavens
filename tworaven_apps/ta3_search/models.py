from django.db import models
from datetime import datetime as dt
from model_utils.models import TimeStampedModel

D3M_DOMAIN = 'D3M_DOMAIN'
DATAVERSE_DOMAIN = 'DATAVERSE_DOMAIN'
EVENTDATA_DOMAIN = 'EVENTDATA_DOMAIN'
DOMAIN_LIST = [D3M_DOMAIN, DATAVERSE_DOMAIN, EVENTDATA_DOMAIN]
APP_DOMAINS = [(d, d) for d in DOMAIN_LIST]

class MessageListener(TimeStampedModel):
    """
    List of web servers that receive TA3-related messages
    """
    name = models.CharField(max_length=255,
                            blank=True)

    web_url = models.URLField(\
                            max_length=255,
                            help_text='URL of web server to send message',
                            unique=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Fill name in"""
        if not self.name:
            time_now = dt.now().strftime('%Y-%m-%d_%H-%M-%S')
            self.name = 'config_%s' % time_now

        if self.web_url.endswith('/'):
            self.web_url = self.web_url[:-1]

        super(MessageListener, self).save(*args, **kwargs)
