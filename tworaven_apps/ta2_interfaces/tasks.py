"""
send a gRPC command that has streaming results
capture the results in the db as StoredResponse objects
"""
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse

from tworaven_apps.R_services.views import create_destination_directory

from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.proto_util import message_to_json
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.view_helper import get_json_error

from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil

from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworavensproject.celery import celery_app

import grpc
import core_pb2

from google.protobuf.json_format import \
    (Parse, ParseError)

import shutil
from os import path

import os
import json
from d3m.container.dataset import Dataset
import numpy as np
import math

from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np


#
# Import Tasks to SearchSolutions/GetSearchSolutionsResults,
#                 FitSolution/GetFitSolutionResults,
#                 ScoreSolution/GetScoreSolutionResults
#
from tworaven_apps.ta2_interfaces.ta2_search_solutions_helper import \
    SearchSolutionsHelper
from tworaven_apps.ta2_interfaces.ta2_fit_solution_helper import FitSolutionHelper
from tworaven_apps.ta2_interfaces.ta2_score_solution_helper import ScoreSolutionHelper



@celery_app.task(ignore_result=True)
def stream_and_store_results(raven_json_str, stored_request_id,
                             grpc_req_obj_name, grpc_call_name, **kwargs):
    """Make the grpc call which has a streaming response

    grpc_req_obj_name: "core_pb2.GetSearchSolutionsResultsRequest", etc
    grpc_call_name: "GetSearchSolutionsResults", etc
    """
    core_stub, err_msg = TA2Connection.get_grpc_stub()
    if err_msg:
        StoredRequestUtil.set_error_status(stored_request_id, err_msg)
        return

    # optional: used to stream messages back to client via channels
    #
    websocket_id = kwargs.get('websocket_id', None)


    #
    grpc_req_obj = eval(grpc_req_obj_name)

    grpc_rpc_call_function = eval('core_stub.%s' % grpc_call_name)

    # --------------------------------
    # convert the JSON string to a gRPC request
    #  Yes: done for the 2nd time
    # --------------------------------
    try:
        req = Parse(raven_json_str,
                    grpc_req_obj())
    except ParseError as err_obj:
        err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
        StoredRequestUtil.set_error_status(stored_request_id, err_msg)
        return


    # --------------------------------
    # Send the gRPC request
    # --------------------------------
    msg_cnt = 0
    try:
        # -----------------------------------------
        # Iterate through the streaming responses
        # -----------------------------------------
        for reply in grpc_rpc_call_function(\
                req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):

            msg_cnt += 1

            stored_resp = None  # to hold a StoredResponse object

            # -----------------------------------------
            # parse the response
            # -----------------------------------------
            msg_json_str = message_to_json(reply)

            msg_json_info = json_loads(msg_json_str)

            # -----------------------------------------
            # does it look ok?
            # -----------------------------------------
            if not msg_json_info.success:
                print('PROBLEM HERE TO LOG!')

                user_msg = 'failed to store response: %s' % \
                           msg_json_info.err_msg
                ws_msg = WebsocketMessage.get_fail_message(\
                            grpc_call_name, user_msg, msg_cnt=msg_cnt)
                ws_msg.send_message(websocket_id)

                continue

            # -----------------------------------------
            # Looks good, save the response
            # -----------------------------------------
            stored_resp_info = StoredResponse.add_response(\
                            stored_request_id,
                            response=msg_json_info.result_obj)

            # -----------------------------------------
            # Make sure the response was saved (probably won't happen)
            # -----------------------------------------
            if not stored_resp_info.success:
                # Not good but probably won't happen
                # send a message to the user...
                #
                user_msg = 'failed to store response: %s' % \
                            msg_json_info.err_msg
                ws_msg = WebsocketMessage.get_fail_message(\
                        grpc_call_name, user_msg, msg_cnt=msg_cnt)

                ws_msg.send_message(websocket_id)

                # Wait for the next response...
                continue


            # -----------------------------------------------
            # send responses back to any open WebSockets
            # ---------------------------------------------
            if websocket_id:
                stored_resp = stored_resp_info.result_obj

                ws_msg = WebsocketMessage.get_success_message(\
                                    grpc_call_name,
                                    'it worked',
                                    msg_cnt=msg_cnt,
                                    data=stored_resp.as_dict())

                print('ws_msg: %s' % ws_msg)
                #print('ws_msg', ws_msg.as_dict())

                ws_msg.send_message(websocket_id)

                StoredResponse.mark_as_read(stored_resp)
            # -----------------------------------------------

            print('msg received #%d' % msg_cnt)

    except grpc.RpcError as err_obj:
        StoredRequestUtil.set_error_status(\
                        stored_request_id,
                        str(err_obj))
        return

    #except Exception as err_obj:
    #    StoredRequestUtil.set_error_status(\
    #                    stored_request_id,
    #                    str(err_obj))
    #    return


    StoredRequestUtil.set_finished_ok_status(stored_request_id)


@celery_app.task()
def split_dataset(configuration, workspace):

    DEFAULT_RATIO = .7
    train_test_ratio = configuration.get('train_test_ratio', DEFAULT_RATIO)
    if not (0 >= train_test_ratio > 1):
        train_test_ratio = DEFAULT_RATIO

    dataset_schema = json.load(open(configuration['dataset_schema'], 'r'))
    resource_schema = next(i for i in dataset_schema['dataResources'] if i['resType'] == 'table')

    dataset = Dataset.load(f'file://{configuration["dataset_schema"]}')
    dataframe = dataset[resource_schema['resID']]

    # rows with NaN values become object rows, which may contain multiple types. The NaN values become empty strings
    # this converts '' to np.nan in non-nominal columns, so that nan may be dropped
    # perhaps in a future version of d3m, the dataset loader could use pandas extension types instead of objects
    nominals = configuration.get('nominals', [])
    for column in [col for col in dataframe.columns.values if col not in nominals]:
        dataframe[column].replace('', np.nan, inplace=True)

    dataframe.dropna(inplace=True)
    dataframe.reset_index(drop=True, inplace=True)

    random_seed = configuration.get('random_seed', 0)
    sample_limit = configuration.get('sample_limit', 1000)
    temporal_variable = configuration.get('temporal_variable')

    # TODO: don't ignore splits file
    splits_file_path = configuration.get('splits_file')
    if splits_file_path:
        pass

    # split dataset along temporal variable
    if temporal_variable:
        num_test_records = math.ceil(train_test_ratio * len(dataframe))
        sorted_index = [
            x for _, x in sorted(
                zip(np.array(dataframe[temporal_variable]), np.arange(0, len(dataframe))),
                # TODO: more robust sorting for temporal data (parse to datetime?)
                key=lambda pair: pair[0])
        ]
        splits = {
            'train': dataframe.iloc[sorted_index[:-num_test_records]],
            'test': dataframe.iloc[sorted_index[-num_test_records:]],
            'stratify': False
        }

    else:
        shuffle = configuration.get('shuffle', True)
        stratified = configuration.get('stratified')

        def run_split():
            try:
                dataframe_train, dataframe_test = train_test_split(
                    dataframe,
                    train_size=train_test_ratio,
                    shuffle=shuffle,
                    stratify=stratified,
                    random_state=random_seed)
                return {'train': dataframe_train, 'test': dataframe_test, 'stratify': stratified}
            except TypeError:
                dataframe_train, dataframe_test = train_test_split(
                    dataframe,
                    shuffle=shuffle,
                    train_size=train_test_ratio,
                    random_state=random_seed)
                return {'train': dataframe_train, 'test': dataframe_test, 'stratify': False}

        splits = run_split()

    def write_dataset(role, writable_dataframe):
        dest_dir_info = create_destination_directory(workspace, role=role)
        if not dest_dir_info.success:
            return JsonResponse(get_json_error(dest_dir_info.err_msg))

        dest_directory = dest_dir_info.result_obj
        csv_path = os.path.join(dest_directory, resource_schema['resPath'])
        shutil.rmtree(dest_directory)
        shutil.copytree(workspace.d3m_config.training_data_root, dest_directory)
        os.remove(csv_path)
        writable_dataframe.to_csv(csv_path)

        sample_count = configuration.get("sampleCount", min(sample_limit, len(writable_dataframe)))
        indices = writable_dataframe['d3mIndex'].astype('int32') \
            .sample(n=sample_count).tolist()

        return path.join(dest_directory, 'datasetDoc.json'), csv_path, indices

    all_datasetDoc, all_datasetCsv, all_indices = write_dataset('all', dataframe)
    train_datasetDoc, train_datasetCsv, train_indices = write_dataset('train', splits['train'])
    test_datasetDoc, test_datasetCsv, test_indices = write_dataset('test', splits['test'])

    datasetDocs = {
        'all': all_datasetDoc,
        'train': train_datasetDoc,
        'test': test_datasetDoc
    }

    datasetCsvs = {
        'all': all_datasetCsv,
        'train': train_datasetCsv,
        'test': test_datasetCsv
    }

    datasetIndices = {
        'all': all_indices,
        'train': train_indices,
        'test': test_indices
    }

    return {
        'dataset_schemas': datasetDocs,
        'dataset_paths': datasetCsvs,
        'indices': datasetIndices,
        'stratified': splits['stratify']
    }
