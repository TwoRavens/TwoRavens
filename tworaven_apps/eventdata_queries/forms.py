import json, jsonfield
from collections import OrderedDict
from django import forms
from django.conf import settings
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob)
from tworaven_apps.eventdata_queries.models import (AGGREGATE, SUBSET, TYPE_OPTIONS, TYPE_CHOICES)

class EventDataSavedQueryForm(forms.Form):
    """ form for event data queries"""

    name = forms.CharField(required=True, label='Name')
    description = forms.CharField(widget=forms.Textarea)
    username = forms.CharField(required=True, label='UserName')
    query = forms.CharField(widget=forms.Textarea)
    result_count = forms.IntegerField(required=True, label='result_count')
    saved_to_dataverse = forms.NullBooleanField(required=False,initial=False)
    dataverse_url = forms.URLField(required=True)
    dataset = forms.CharField(widget=forms.Textarea)
    dataset_type = forms.CharField(required=True, initial= SUBSET)

    def clean_name(self):
        name = self.cleaned_data.get('name')

        return name

    def clean_username(self):
        username = self.cleaned_data.get('username')

        return username

    def clean_description(self):
        desc = self.cleaned_data.get('description')

        return desc

    def clean_query(self):
        """
        - passed to the form as a string but it we want it as an OrderedDict
            - e.g. input: "OrderedDict([('ads', 'asd')])"
        """
        query_str = self.cleaned_data.get('query')
        # if it doesn't give error in json.dumps( ) then it can be converted into Ordereddict,
        #  Also to consider list as json, dict should not be checked as dict does not take lists
        return json.dumps(query_str)

    def clean_result_count(self):
        res_count = self.cleaned_data.get('result_count')

        return res_count

    def clean_saved_to_dataverse(self):
        """ check if the format is valid"""
        input_saved_to_dataverse = self.cleaned_data.get('saved_to_dataverse')
        if not input_saved_to_dataverse:
            input_saved_to_dataverse = False

        return input_saved_to_dataverse

    def clean_dataverse_url(self):
        dataverse_url = self.cleaned_data.get('dataverse_url')

        return dataverse_url

    def clean_dataset(self):
        dataset_input = self.cleaned_data.get('dataset')

        return dataset_input

    def clean_dataset_type(self):
        dataset_type = self.cleaned_data.get('dataset_type')
        print("type choces", list(TYPE_OPTIONS))
        if dataset_type in TYPE_OPTIONS:
            return dataset_type
        else:
            raise forms.ValidationError("The type input is not among subset or aggregate: %s" % dataset_type)


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

