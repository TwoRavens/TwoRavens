import json, jsonfield
from collections import OrderedDict
from django import forms
from django.conf import settings
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob)


class EventDataSavedQueryForm(forms.Form):
    """ form for event data queries"""

    name = forms.CharField(required=True, label='Name')
    description = forms.CharField(widget=forms.Textarea)
    username = forms.CharField(required=True, label='UserName')
    query = forms.CharField(widget=forms.Textarea)
    result_count = forms.IntegerField(required=True, label='result_count')
    saved_to_dataverse = forms.NullBooleanField(required=False,initial=False)
    dataverse_url = forms.URLField(required=True)

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

        try:
            dict_type = eval(query_str)
        except SyntaxError:
            raise forms.ValidationError("The query is invalid: %s" % query_str)
        except NameError:
            raise forms.ValidationError("The query is invalid: %s" % query_str)

        if isinstance(dict_type, dict):
            return dict_type

        raise forms.ValidationError("The query is invalid: %s" % query_str)


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
