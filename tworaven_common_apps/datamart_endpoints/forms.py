from django import forms
import json
from tworaven_apps.utils.json_helper import json_loads

#from tworaven_common_apps.datamart_endpoints.static_vals import DATAMART_SOURCES
from tworaven_common_apps.datamart_endpoints.datamart_info_util import \
    (is_datamart_name,)


class DatamartUploadForm(forms.Form):

    data = forms.CharField(required=True, widget=forms.Textarea)

    def clean_data(self):
        return self.cleaned_data.get('data')


class DatamartCustomForm(forms.Form):

    custom = forms.CharField(required=True, widget=forms.Textarea)
    source = forms.CharField(required=True, widget=forms.Textarea)

    def clean_data(self):
        return json.loads(self.cleaned_data.get('custom'))

    def clean_source(self):
        return self.cleaned_data.get('source')


class DatamartScrapeForm(forms.Form):

    url = forms.CharField(required=True, widget=forms.Textarea)

    def clean_link(self):
        return self.cleaned_data.get('url')


class DatamartIndexForm(forms.Form):

    index = forms.CharField(required=True, widget=forms.Textarea)
    source = forms.CharField(required=True, widget=forms.Textarea)

    def clean_index(self):
        return json.loads(self.cleaned_data.get('index'))

    def clean_source(self):
        return self.cleaned_data.get('source')


class DatamartSearchForm(forms.Form):

    source = forms.CharField(required=True, widget=forms.Textarea)
    query = forms.CharField(required=True, widget=forms.Textarea)
    data_path = forms.CharField(required=False, widget=forms.Textarea)
    limit = forms.IntegerField(required=False)

    def clean_source(self):
        source = self.cleaned_data.get('source')
        if not is_datamart_name(source):
            raise ValueError((f"The 'source' argument '{source}'"
                              f" is not an active Datamart in the database"))
        return source

    def clean_query(self):
        return json.loads(self.cleaned_data.get('query'))

    def clean_data_path(self):
        return self.cleaned_data.get('data_path')

    def clean_limit(self):
        return self.cleaned_data.get('limit')


class DatamartAugmentForm(forms.Form):
    source = forms.CharField(required=True, widget=forms.Textarea)
    data_path = forms.CharField(required=True, widget=forms.Textarea)
    search_result = forms.CharField(required=True, widget=forms.Textarea)
    left_columns = forms.CharField(required=False, widget=forms.Textarea)
    right_columns = forms.CharField(required=False, widget=forms.Textarea)
    exact_match = forms.BooleanField(required=False)

    def clean_source(self):
        source = self.cleaned_data.get('source')
        if not is_datamart_name(source):
            raise ValueError((f"The 'source' argument '{source}'"
                              f" is not an active Datamart in the database"))
        #if source not in DATAMART_SOURCES:
        #    raise ValueError(f"The 'source' argument {source} must be a member of {DATAMART_SOURCES}")
        return source

    #def clean_data_path(self):
    #    return self.cleaned_data.get('data_path')

    def clean_search_result(self):
        json_info = json_loads(self.cleaned_data.get('search_result'))
        if not json_info.success:
            raise ValueError(("The 'search_result' is not valid JSON."
                              " %s") % json_info.err_msg)

        return json_info.result_obj

        #return json.loads(self.cleaned_data.get('search_result'))

    def clean_left_columns(self):
        return json.loads(self.cleaned_data.get('left_columns') or '{}')

    def clean_right_columns(self):
        return json.loads(self.cleaned_data.get('right_columns') or '{}')

    def clean_exact_match(self):
        return self.cleaned_data.get('exact_match')


class DatamartMaterializeForm(forms.Form):

    source = forms.CharField(required=True, widget=forms.Textarea)
    search_result = forms.CharField(required=True)

    def clean_source(self):
        source = self.cleaned_data.get('source')
        if not is_datamart_name(source):
            raise ValueError((f"The 'source' argument '{source}'"
                              f" is not an active Datamart in the database"))
        #if source not in DATAMART_SOURCES:
        #    raise ValueError(f"The 'source' argument {source}
        # must be a member of {DATAMART_SOURCES}")
        return source

    def clean_search_result(self):
        """Convert search_result to a python dict"""
        json_info = json_loads(self.cleaned_data.get('search_result'))
        if not json_info.success:
            raise ValueError(("The 'search_result' is not valid JSON."
                              " %s") % json_info.err_msg)

        return json_info.result_obj

        # is not an active Datamart in the database"))
        #    user_msg = "'search_result' is not valid JSON. %s" % search_result_or_err
        #    return JsonResponse(get_json_error(user_msg))
        #json

        #return json.loads(self.cleaned_data.get('search_result'))
