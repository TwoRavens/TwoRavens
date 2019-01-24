from django import forms
import json


class DatamartUploadForm(forms.Form):
    """ check if search parameters are ok"""

    data = forms.CharField(required=True, widget=forms.Textarea)

    def clean_data(self):
        return self.cleaned_data.get('title')


class DatamartSearchForm(forms.Form):
    """ check if search parameters are ok"""

    query = forms.CharField(required=True, widget=forms.Textarea)
    data_path = forms.CharField(required=False, widget=forms.Textarea)

    def clean_query(self):
        return json.loads(self.cleaned_data.get('query'))

    def clean_path(self):
        return self.cleaned_data.get('query')


class DatamartAugmentForm(forms.Form):
    """ check if augment parameters are ok"""
    index = forms.CharField(required=True, widget=forms.Textarea)

    def clean_index(self):
        return self.cleaned_data.get('index')


class DatamartMaterializeForm(forms.Form):
    """ check if materialize parameters are ok"""

    index = forms.IntegerField(required=True)
    datamart_id = forms.IntegerField(required=True)

    def clean_index(self):
        index = self.cleaned_data.get('index')
        if index < 0:
            raise ValueError('index must be greater than zero')
        return index

    def clean_datamart_id(self):
        return self.cleaned_data.get('datamart_id')
