import json

from django import forms
from django.conf import settings
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob)


class EventDataSavedQueryForm(forms.ModelForm):
    """ form for event data queries"""


