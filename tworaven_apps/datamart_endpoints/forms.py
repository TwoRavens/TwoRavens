from django import forms
import json


class DatamartSearchForm(forms.Form):
    """ check if search parameters are ok"""

    query = forms.CharField(required=True, widget=forms.Textarea)

    def clean_query(self):
        return json.loads(self.cleaned_data.get('query'))


class DatamartJoinForm(forms.Form):
    """ check if join parameters are ok"""

    query = forms.CharField(required=True, widget=forms.Textarea)

    def clean_query(self):
        return json.loads(self.cleaned_data.get('query'))


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
