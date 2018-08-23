import json, jsonfield
from collections import OrderedDict
from django import forms
from django.conf import settings
from tworaven_apps.eventdata_queries.models import \
    (EventDataSavedQuery, ArchiveQueryJob,
     AGGREGATE, SUBSET,
     TYPE_OPTIONS, TYPE_CHOICES,
     METHOD_CHOICES, HOST_CHOICES)

class EventDataSavedQueryForm(forms.ModelForm):
    """ form for event data queries"""

    class Meta:
        model = EventDataSavedQuery
        fields = ['name',
                  'description',
                  'query',
                  'result_count',
                  'collection_name',
                  'collection_type']

    def clean_query(self):
        """
        - passed to the form as a string but it we want it as an OrderedDict
            - e.g. input: "OrderedDict([('ads', 'asd')])"
        """
        query_info = self.cleaned_data.get('query')

        if not isinstance(query_info, (list, dict)):
            user_msg = ('The query was invalid'
                        ' (not a list or object): %s') % \
                        (query_info,)
            raise forms.ValidationError(user_msg)

        return query_info



class EventDataQueryFormSearch(forms.Form):
    """ to check if search parameters are ok"""

    name = forms.CharField(required=False, label='Name')
    description = forms.CharField(required=False, widget=forms.Textarea)
    username = forms.CharField(required=False, label='UserName')

    def clean_name(self):
        name = self.cleaned_data.get('name')

        return name

    def clean_username(self):
        username = self.cleaned_data.get('username')

        return username

    def clean_description(self):
        desc = self.cleaned_data.get('description')

        return desc


class EventDataGetDataForm(forms.Form):
    """ check if query submission parameters are ok"""

    host = forms.CharField(required=False, widget=forms.Textarea, initial=HOST_CHOICES[0])
    collection_name = forms.CharField(required=True, widget=forms.Textarea)
    method = forms.CharField(required=True, widget=forms.Textarea)
    query = forms.CharField(required=True, widget=forms.Textarea)
    distinct = forms.CharField(required=False, widget=forms.Textarea)

    def clean_host(self):
        host = self.cleaned_data.get('host')
        if host in HOST_CHOICES:
            return host
        else:
            raise forms.ValidationError('The host is not among %s: %s' % (str(HOST_CHOICES), host))

    def clean_collection_name(self):
        return self.cleaned_data.get('collection_name')

    def clean_method(self):
        method = self.cleaned_data.get('method')
        if method in METHOD_CHOICES:
            return method
        else:
            raise forms.ValidationError("The collection method is not among %s: %s" % (str(METHOD_CHOICES), method))

    def clean_query(self):
        return json.loads(self.cleaned_data.get('query'))

    def clean_distinct(self):
        return self.cleaned_data.get('distinct')


class EventDataGetMetadataForm(forms.Form):
    """ check if metadata parameters are ok"""

    alignments = forms.CharField(required=False, widget=forms.Textarea)
    formats = forms.CharField(required=False, widget=forms.Textarea)
    collections = forms.CharField(required=False, widget=forms.Textarea)

    def clean_alignments(self):
        return self.cleaned_data.get('alignments')

    def clean_formats(self):
        return self.cleaned_data.get('formats')

    def clean_collections(self):
        return self.cleaned_data.get('collections')
