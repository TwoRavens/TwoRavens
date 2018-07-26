import json
import pandas as pd
from collections import OrderedDict
from django.http import HttpResponse, JsonResponse
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)

class GenerateReadMe(object):

    def __init__(self, query_obj):
        """ generate the read me """
        print("generate the read me")
        print(query_obj)
        self.query_obj = query_obj

    def generate_readme(self):
        try:
            readme_string = '    EVENTDATA README    \n'\
                            '----------------------- \n' \
                            '----------------------- \n'\
                            'Username : %s \n' \
                            '----------------------- \n' \
                            'Description : %s \n' \
                            '----------------------- \n' \
                            'Created : %s \n' \
                            '----------------------- \n' \
                            'Collection Name : %s \n' \
                            '----------------------- \n'\
                            'Query : %s \n'\
                            '\n'\
                            '----------------------- \n' \
                            '----------------------- \n' % (self.query_obj['username'],
                                                            self.query_obj['description'],
                                                            self.query_obj['created'],
                                                            str(self.query_obj['collection_name']),
                                                            json.dumps(self.query_obj['query']))
        except ValueError:
            return err_resp('error in data provided %s' % self.query_obj)

        return ok_resp(readme_string)
