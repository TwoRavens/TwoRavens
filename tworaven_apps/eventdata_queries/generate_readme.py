import json
import pandas as pd
from collections import OrderedDict
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.eventdata_queries.dataverse.dataverse_file_upload import DataverseFileUpload
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)

class GenerateReadMe(object):

    def __init__(self, query_obj):
        """ generate the read me """
        print("generate the read me")
        print(query_obj['name'], query_obj['id'])
        self.query_obj = query_obj

    def generate_readme(self):

        info = dict(query_info=self.query_obj)
        readme_string = render_to_string('eventdata_readme.md',
                                         info)
        file_name = '%s_%s.md' % (str(self.query_obj['id']), str(self.query_obj['collection_name']))
        readme_dict = dict(file_content=readme_string)
        file_uploader = DataverseFileUpload(file_name, **readme_dict)
        if file_uploader.has_error():
            # do something; tell user
            return

        succ, res_obj = file_uploader.return_status()
        if not succ:
            return

        return ok_resp(res_obj)
        # try:
        #     readme_string = '    EVENTDATA README    \n'\
        #                     '----------------------- \n' \
        #                     '----------------------- \n'\
        #                     'Username : %s \n' \
        #                     '----------------------- \n' \
        #                     'Description : %s \n' \
        #                     '----------------------- \n' \
        #                     'Created : %s \n' \
        #                     '----------------------- \n' \
        #                     'Collection Name : %s \n' \
        #                     '----------------------- \n'\
        #                     'Query : %s \n'\
        #                     '\n'\
        #                     '----------------------- \n' \
        #                     '----------------------- \n' % (self.query_obj['username'],
        #                                                     self.query_obj['description'],
        #                                                     self.query_obj['created'],
        #                                                     str(self.query_obj['collection_name']),
        #                                                     json.dumps(self.query_obj['query']))
        # except ValueError:
        #     return err_resp('error in data provided %s' % self.query_obj)

        # return ok_resp(readme_string)


"""
python manage.py shell
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob)
from tworaven_apps.eventdata_queries.generate_readme import GenerateReadMe

q = EventDataSavedQuery.objects.first()
grm = GenerateReadMe(q)
print(grm.generate_readme())
"""