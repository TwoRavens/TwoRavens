from django import forms
import json

from tworaven_common_apps.datamart_endpoints.models import DATAMART_SOURCES


class DatamartUploadForm(forms.Form):
    """ check if search parameters are ok"""

    data = forms.CharField(required=True, widget=forms.Textarea)

    def clean_data(self):
        return self.cleaned_data.get('title')


class DatamartSearchForm(forms.Form):
    """ check if search parameters are ok"""

    source = forms.CharField(required=True, widget=forms.Textarea)
    query = forms.CharField(required=True, widget=forms.Textarea)
    data_path = forms.CharField(required=False, widget=forms.Textarea)

    def clean_source(self):
        source = self.cleaned_data.get('source')
        if source not in DATAMART_SOURCES:
            raise ValueError(f"The 'source' argument {source} must be a member of {DATAMART_SOURCES}")
        return source

    def clean_query(self):
        return json.loads(self.cleaned_data.get('query'))

    def clean_path(self):
        return self.cleaned_data.get('query')


class DatamartAugmentForm(forms.Form):
    """ check if augment parameters are ok"""
    source = forms.CharField(required=True, widget=forms.Textarea)
    data_path = forms.CharField(required=True, widget=forms.Textarea)
    search_result = forms.CharField(required=True, widget=forms.Textarea)
    left_columns = forms.CharField(required=False, widget=forms.Textarea)
    right_columns = forms.CharField(required=False, widget=forms.Textarea)

    def clean_source(self):
        source = self.cleaned_data.get('source')
        if source not in DATAMART_SOURCES:
            raise ValueError(f"The 'source' argument {source} must be a member of {DATAMART_SOURCES}")
        return source

    def clean_data_path(self):
        return self.cleaned_data.get('data_path')

    def clean_search_result(self):
        return json.loads(self.cleaned_data.get('search_result'))

    def clean_left_columns(self):
        return json.loads(self.cleaned_data.get('left_columns'))

    def clean_right_columns(self):
        return json.loads(self.cleaned_data.get('right_columns'))


class DatamartMaterializeForm(forms.Form):
    """ check if materialize parameters are ok"""

    source = forms.CharField(required=True, widget=forms.Textarea)
    search_result = forms.CharField(required=True)

    def clean_source(self):
        source = self.cleaned_data.get('source')
        if source not in DATAMART_SOURCES:
            raise ValueError(f"The 'source' argument {source} must be a member of {DATAMART_SOURCES}")
        return source

    def clean_search_result(self):
        return json.loads(self.cleaned_data.get('search_result'))
