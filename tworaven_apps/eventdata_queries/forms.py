import json, jsonfield
from collections import OrderedDict
from django import forms
from django.conf import settings
from tworaven_apps.eventdata_queries.models import \
    (EventDataSavedQuery, ArchiveQueryJob,
     AGGREGATE, SUBSET,
     TYPE_OPTIONS, TYPE_CHOICES,
     METHOD_CHOICES, EXPORT_CHOICES, HOST_CHOICES)


class EventDataSavedQueryForm(forms.ModelForm):
    """ form for event data queries"""

    class Meta:
        model = EventDataSavedQuery
        fields = ['name',
                  'user',
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

    @staticmethod
    def get_duplicate_record_error_msg():
        """Return error message for breaking unique constraints"""
        dupe_err_msg = ('You have already saved a query with this information.'
                        ' (Same query, collection, and collection name.)')

        return dupe_err_msg

    def clean(self):
        """Check is this unsaved model already exists"""

        filter_params = {}
        unique_key = ['user', 'collection_name', 'collection_type', 'query']
        for key in unique_key:
            filter_params[key] = self.cleaned_data[key]

        # check 1
        #
        cnt = EventDataSavedQuery.objects.filter(**filter_params).count()
        if cnt > 0:
            # already exists, save will fail
            #
            self._errors["query"] = self.error_class( \
                [self.get_duplicate_record_error_msg()])
            del self.cleaned_data["query"]

        else:
            # check 2
            #
            filter_params2 = dict(user=self.cleaned_data['user'],
                                  name=self.cleaned_data['name'])

            cnt2 = EventDataSavedQuery.objects.filter(**filter_params2).count()
            if cnt2 > 0:
                user_msg = ('You have already used this name.'
                            ' Please use a different name for this query.')
                self._errors["name"] = self.error_class( \
                    [user_msg])
                del self.cleaned_data["name"]

        return self.cleaned_data


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


class EventDataGetManipulationForm(forms.Form):
    """ check if query submission parameters are ok"""

    collection_name = forms.CharField(required=True, widget=forms.Textarea)
    method = forms.CharField(required=True, widget=forms.Textarea)
    query = forms.CharField(required=True, widget=forms.Textarea)
    distinct = forms.CharField(required=False, widget=forms.Textarea)
    datafile = forms.CharField(required=False, widget=forms.Textarea)
    reload = forms.BooleanField(required=False)

    metadata = forms.CharField(required=False, widget=forms.Textarea)
    export = forms.CharField(required=False, widget=forms.Textarea)

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

    def clean_datafile(self):
        return self.cleaned_data.get('datafile')

    def clean_reload(self):
        return self.cleaned_data.get('reload')

    def clean_metadata(self):
        return self.cleaned_data.get('metadata')

    def clean_export(self):
        if not self.cleaned_data['export']:
            return
        export = self.cleaned_data['export']
        if export not in EXPORT_CHOICES:
            raise forms.ValidationError("The export choice is not among %s: %s" % (str(EXPORT_CHOICES), export))
        if export == 'dataset' and not self.cleaned_data.get('metadata'):
            print('Cleaned data')
            print(self.cleaned_data)
            raise forms.ValidationError('The export choice "dataset" must have metadata')
        return export
