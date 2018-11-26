import json
import os
import sys
from collections import OrderedDict
from os.path import abspath, dirname

# ----------------------------------------------------
# Add this directory to the python system path
# ----------------------------------------------------
BASE_DIR = dirname(dirname(dirname(abspath(__file__))))
sys.path.append(BASE_DIR)

# ----------------------------------------------------
# Set the DJANGO_SETTINGS_MODULE, if it's not already
# ----------------------------------------------------
KEY_DJANGO_SETTINGS_MODULE = 'DJANGO_SETTINGS_MODULE'
if not KEY_DJANGO_SETTINGS_MODULE in os.environ:
    os.environ.setdefault(KEY_DJANGO_SETTINGS_MODULE,
                          'tworavensproject.settings.local_settings')

os.environ.setdefault('TA2_STATIC_TEST_MODE', '0')

import django
django.setup()

from tworaven_apps.ta2_interfaces.ta2_search_solutions_helper import \
        SearchSolutionsHelper
from tworaven_apps.ta2_interfaces.req_search_solutions import \
        (solution_export_with_saved_response,)
from tworaven_apps.ta2_interfaces.static_vals import \
        (KEY_PIPELINE_ID, KEY_RANK)
#from tworaven_apps.ta2_interfaces.tasks import \
#    (make_search_solutions_call, kick_off_solution_results)

def run_test():
    """brief test with TA2 running"""
    xsearch_params_baseball = """{"searchSolutionParams":{"userAgent":"TwoRavens","version":"2018.7.7","timeBound":2,"priority":1,"allowedValueTypes":["DATASET_URI","CSV_URI"],"problem":{"problem":{"id":"185_bl_problem_TRAIN","version":"1.0","name":"NULL","description":"","taskType":"CLASSIFICATION","taskSubtype":"MULTICLASS","performanceMetrics":[{"metric":"F1_MACRO"}]},"inputs":[{"datasetId":"185_bl_dataset_TRAIN","targets":[{"resourceId":"0","columnIndex":17,"columnName":"Hall_of_Fame"}]}]},"template":{"inputs":[],"outputs":[],"steps":[]},"inputs":[{"dataset_uri":"file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/datasetDoc.json"}]},"fitSolutionDefaultParams":{"inputs":[{"dataset_uri":"file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/datasetDoc.json"}],"exposeOutputs":[],"exposeValueTypes":["CSV_URI"],"users":[{"id":"TwoRavens","choosen":false,"reason":""}]},"scoreSolutionDefaultParams":{},"produceSolutionDefaultParams":{"inputs":[{"dataset_uri":"file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/datasetDoc.json"}],"exposeOutputs":[],"exposeValueTypes":["CSV_URI"]}}"""

    search_params_baseball = """{"searchSolutionParams":{"userAgent":"TwoRavens","version":"2018.7.7","timeBound":2,"priority":1,"allowedValueTypes":["DATASET_URI","CSV_URI"],"problem":{"problem":{"id":"185_bl_problem_TRAIN","version":"1.0","name":"NULL","description":"","taskType":"CLASSIFICATION","taskSubtype":"MULTICLASS","performanceMetrics":[{"metric":"F1_MACRO"}]},"inputs":[{"datasetId":"185_bl_dataset_TRAIN","targets":[{"resourceId":"0","columnIndex":17,"columnName":"Hall_of_Fame"}]}]},"template":{"inputs":[],"outputs":[],"steps":[]},"inputs":[{"dataset_uri":"file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/datasetDoc.json"}]},"fitSolutionDefaultParams":{"inputs":[{"dataset_uri":"file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/datasetDoc.json"}],"exposeOutputs":[],"exposeValueTypes":["CSV_URI"],"users":[{"id":"TwoRavens","choosen":false,"reason":""}]},"produceSolutionDefaultParams":{"inputs":[{"dataset_uri":"file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/datasetDoc.json"}],"exposeOutputs":[],"exposeValueTypes":["CSV_URI"]},"scoreSolutionDefaultParams":{"inputs":[{"dataset_uri":"file:///ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/datasetDoc.json"}],"performanceMetrics":[{"metric":"F1_MACRO"}],"users":[{"id":"TwoRavens","choosen":false,"reason":""}],"configuration":{"method":"HOLDOUT","folds":0,"trainTestRatio":0,"shuffle":false,"randomSeed":0,"stratified":false}}}"""

    search_params_baseball = json.loads(search_params_baseball,
                                        object_pairs_hook=OrderedDict)

    websocket_id = 'dev_admin'
    user_id = 1 # id of dev_admin
    info = SearchSolutionsHelper.make_search_solutions_call(\
                        search_params_baseball, websocket_id, user_id)

    if not info.success:
        print(info.err_msg)
        return

    #search_id = info.result_obj

def run_test2():
    params = {KEY_PIPELINE_ID: 3975, KEY_RANK: 0.6}
    resp = solution_export_with_saved_response(params)
    if resp.success:
        print('it worked: %s' % resp.result_obj)
    else:
        print('Error: %s' % resp.err_msg)

if __name__ == '__main__':
    run_test2()
