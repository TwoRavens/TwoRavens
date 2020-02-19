"""
Forms for validating datamart related input
"""

import json

from django import forms
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.dict_helper import (clear_dict,)

#from tworaven_apps.datamart_endpoints.static_vals import DATAMART_SOURCES
from tworaven_apps.datamart_endpoints.datamart_info_util import \
    (is_datamart_name,)


class DatamartSourceBaseForm(forms.Form):
    """Contains the "source" attribute and related error message"""
    source = forms.CharField(required=True, widget=forms.Textarea)

    def clean_source(self):
        source = self.cleaned_data.get('source')
        if not is_datamart_name(source):
            user_msg = (f"'{source}' is not an active Datamart"
                        f" in the database")
            raise forms.ValidationError(user_msg)

        return source


class DatamartSearchByDatasetForm(DatamartSourceBaseForm):
    dataset_path = forms.CharField(required=True, widget=forms.Textarea)


class DatamartUploadForm(forms.Form):

    data = forms.CharField(required=True, widget=forms.Textarea)

    def clean_data(self):
        return self.cleaned_data.get('data')


class DatamartCustomForm(DatamartSourceBaseForm):

    custom = forms.CharField(required=True, widget=forms.Textarea)

    def clean_data(self):
        return json.loads(self.cleaned_data.get('custom'))



class DatamartScrapeForm(forms.Form):

    url = forms.CharField(required=True, widget=forms.Textarea)

    def clean_link(self):
        return self.cleaned_data.get('url')


class DatamartIndexForm(DatamartSourceBaseForm):

    indices = forms.CharField(required=True, widget=forms.Textarea)

    def clean_index(self):
        return json.loads(self.cleaned_data.get('indices'))


class DatamartSearchForm(DatamartSourceBaseForm):

    query = forms.CharField(required=True, widget=forms.Textarea)
    data_path = forms.CharField(required=False, widget=forms.Textarea)
    limit = forms.IntegerField(required=False)

    def clean_query(self):
        """Load this as JSON, make sure that it contains at least 1 search param"""

        query_info_json = json_loads(self.cleaned_data.get('query'))
        if not query_info_json.success:
            user_msg = ('The search is not formatted correctly.'
                        ' Please try again.'
                        ' (Expected a JSON string)')
            raise forms.ValidationError(user_msg)

        query_dict = query_info_json.result_obj

        clear_dict(query_dict)
        if not query_dict:
            user_msg = ('The search must contain at least 1 keyword or'
                        ' variable.  Please try again. (id:1)')
            raise forms.ValidationError(user_msg)

        if not 'keywords' in query_dict:
            if not 'variables' in query_dict:
                user_msg = ('The search must contain at least 1 keyword or'
                            ' variable.  Please try again. (id:2)')
                raise forms.ValidationError(user_msg)

        return query_dict


    def clean_data_path(self):
        return self.cleaned_data.get('data_path')

    def clean_limit(self):
        return self.cleaned_data.get('limit')


class DatamartAugmentForm(DatamartSourceBaseForm):
    data_path = forms.CharField(required=True, widget=forms.Textarea)
    search_result = forms.CharField(required=True, widget=forms.Textarea)
    left_columns = forms.CharField(required=False, widget=forms.Textarea)
    right_columns = forms.CharField(required=False, widget=forms.Textarea)
    exact_match = forms.BooleanField(required=False)

    #def clean_data_path(self):
    #    return self.cleaned_data.get('data_path')

    def clean_search_result(self):
        json_info = json_loads(self.cleaned_data.get('search_result'))
        if not json_info.success:
            raise forms.ValidatonError(\
                             ("The 'search_result' is not valid JSON."
                              " %s") % json_info.err_msg)

        return json_info.result_obj

        #return json.loads(self.cleaned_data.get('search_result'))

    def clean_left_columns(self):
        return json.loads(self.cleaned_data.get('left_columns') or '{}')

    def clean_right_columns(self):
        return json.loads(self.cleaned_data.get('right_columns') or '{}')

    def clean_exact_match(self):
        return self.cleaned_data.get('exact_match')


class DatamartMaterializeForm(DatamartSourceBaseForm):

    search_result = forms.CharField(required=True)

    def clean_search_result(self):
        """Convert search_result to a python dict"""
        json_info = json_loads(self.cleaned_data.get('search_result'))
        if not json_info.success:
            user_msg = (f"The 'search_result' is not valid JSON."
                        f' {json_info.err_msg}')
            raise forms.ValidatonError(user_msg)

        return json_info.result_obj
