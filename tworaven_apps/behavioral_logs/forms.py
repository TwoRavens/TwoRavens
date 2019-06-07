"""Form(s) for evaluating incoming log entries"""

from django.forms import ModelForm
from tworaven_apps.behavioral_logs.models import BehavioralLogEntry

class BehavioralLogEntryForm(ModelForm):
    """Behavioral Log entry form"""

    class Meta:
        model = BehavioralLogEntry
        fields = ['type', 'activity_l1', 'activity_l2', 'path']
