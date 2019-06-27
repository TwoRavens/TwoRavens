"""Form(s) for evaluating incoming log entries"""
import ast
from collections import OrderedDict
from django.forms import ModelForm
from tworaven_apps.behavioral_logs.models import BehavioralLogEntry

class BehavioralLogEntryForm(ModelForm):
    """Behavioral Log entry form"""

    class Meta:
        """set model and fields"""
        model = BehavioralLogEntry
        fields = ['type',
                  'activity_l1', 'activity_l2',
                  'path',         # (optional)
                  'session_key',  # (optional)
                  'feature_id',   # (optional)
                  'other',   # (optional)
                  ]

    def clean_other(self):
        """Format other, if there's a value it should return as a dict"""
        other = self.cleaned_data.get('other')

        if not other:
            return other

        if isinstance(other, str) and other.find('OrderedDict') > -1:
            other = eval(other)

        return other
