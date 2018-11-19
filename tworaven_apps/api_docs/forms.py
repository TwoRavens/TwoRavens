from django import forms
from django.urls import reverse


class ClientTestForm(forms.Form):
    """Test gRPC requests, as originating from the UI"""

    request_type = forms.ChoiceField(choices=('pre-init', 'pre-init'))

    content = forms.CharField(widget=forms.Textarea,
                              initial='{}',
                              help_text="Enter JSON info")

    def __init__(self, *args, **kwargs):
        super(ClientTestForm, self).__init__(*args, **kwargs)

        from tworaven_apps.ta2_interfaces import urls as ta2_urls

        rtype_choices = [(reverse(rt.name, args=()), rt.name)
                         for rt in ta2_urls.urlpatterns
                         if rt.name.lower() != rt.name]

        self.fields['request_type'] = forms.ChoiceField(choices=rtype_choices)
