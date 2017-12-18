from django import forms import ModelForm

from tworaven_apps.ta3_search.models import MessageListener


class MessageListenerForm(forms.Form):

    web_url = forms.URLField()
    name = forms.CharField(max_length=100)

    def get_listener(self):
        assert self.is_valid(),\
            "Be sure to call is_valid() before using this method"

        # Retrieve the object or create new one
        #
        listener_obj, created = MessageListener.objects.get_or_create(\
                                    web_url=self.cleaned_data['web_url'])

        # if applicable, update the name
        if 'name' in self.cleaned_data:
            listener_obj.name = self.cleaned_data['name']

        # make sure it's active
        listener_obj.is_active = True

        # save it
        listener.save()

        return listener_obj, created



class MessageListenerForm(forms.ModelForm):
    class Meta:
        model = MessageListener
        fields = ['name', 'web_url',]
