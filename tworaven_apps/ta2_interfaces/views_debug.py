import json
import os
import datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from tworaven_apps.utils.view_helper import (
    get_request_body_as_json,
    get_json_error,)

import shutil

@csrf_exempt
def view_zip_solutions(request):
    req_body_info = get_request_body_as_json(request)
    if not req_body_info.success:
        return JsonResponse(get_json_error(req_body_info.err_msg))

    data = req_body_info.result_obj

    problem = data['problem']
    dataset_name = data['dataset_name']

    ZIP_OUTPUT_DIRECTORY = os.path.join(
        os.path.expanduser('~/automl_scores'),
        dataset_name,
        datetime.datetime.now().strftime("%d-%m-%Y %H:%M:%S"))

    if not os.path.exists(ZIP_OUTPUT_DIRECTORY):
        os.makedirs(ZIP_OUTPUT_DIRECTORY)

    with open(os.path.join(ZIP_OUTPUT_DIRECTORY, problem['problemID'] + '.json'), 'w') as outfile:
        json.dump(problem, outfile, sort_keys=True, indent=4, separators=(',', ': '))

    # copy dataset level data
    splits_dir = os.path.join(ZIP_OUTPUT_DIRECTORY, 'splits')
    if not os.path.exists(splits_dir):
        os.makedirs(splits_dir)
    for data_split in problem['datasetPaths']:
        shutil.copyfile(problem['datasetPaths'][data_split], os.path.join(splits_dir, data_split + '.csv'))

    # copy solution level data
    solutions_dir = os.path.join(ZIP_OUTPUT_DIRECTORY, 'solutions')
    if not os.path.exists(solutions_dir):
        os.makedirs(solutions_dir)

    solutions_summaries = data['solutions']
    for solution in solutions_summaries:

        # build each solution folder
        output_dir = os.path.join(solutions_dir, f"{solution['systemId']}-{solution['solutionId']}")
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        for output in solution['outputs']:
            shutil.copyfile(
                output['output'].replace('file://', ''),
                os.path.join(output_dir, f'{output["name"]}_{output["predict type"]}.csv'))

    # todo: return path to zip, not a directory to be zipped
    return JsonResponse({
        'success': True,
        'data': ZIP_OUTPUT_DIRECTORY
    })
