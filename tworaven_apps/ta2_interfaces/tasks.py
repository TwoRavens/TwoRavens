"""
send a gRPC command that has streaming results
capture the results in the db as StoredResponse objects
"""
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse

from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA

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

from tworaven_apps.utils.random_info import get_timestamp_string
from tworaven_apps.utils.file_util import create_directory

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

#
# Import Tasks to SearchSolutions/GetSearchSolutionsResults,
#                 FitSolution/GetFitSolutionResults,
#                 ScoreSolution/GetScoreSolutionResults
#
from tworaven_apps.ta2_interfaces.ta2_search_solutions_helper import \
    SearchSolutionsHelper
from tworaven_apps.ta2_interfaces.ta2_fit_solution_helper import FitSolutionHelper
from tworaven_apps.ta2_interfaces.ta2_score_solution_helper import ScoreSolutionHelper
from tworaven_apps.user_workspaces.models import UserWorkspace


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

    DEFAULT_RATIO = .7
    train_test_ratio = configuration.get('train_test_ratio', DEFAULT_RATIO)
    if not (0 >= train_test_ratio > 1):
        train_test_ratio = DEFAULT_RATIO

    random_seed = configuration.get('random_seed', 0)
    sample_limit = configuration.get('sample_limit', 1000)
    temporal_variable = configuration.get('temporal_variable')

    # TODO: use d3m splitting primitive
    splits_file_path = configuration.get('splits_file_path')
    if splits_file_path:
        splits_dataframe = pd.read_csv(splits_file_path)
        train_indices = set(splits_dataframe[splits_dataframe['type'] == 'TRAIN']['d3mIndex'].tolist())
        test_indices = set(splits_dataframe[splits_dataframe['type'] == 'TEST']['d3mIndex'].tolist())

        splits = {
            'train': dataframe[dataframe['d3mIndex'].astype(int).isin(train_indices)],
            'test': dataframe[dataframe['d3mIndex'].astype(int).isin(test_indices)],
            'stratify': False
        }

    # split dataset along temporal variable
    elif temporal_variable:
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
        dest_dir_info = create_destination_directory(workspace, name=role)
        if not dest_dir_info[KEY_SUCCESS]:
            return JsonResponse(get_json_error(dest_dir_info.err_msg))

        dest_directory = dest_dir_info[KEY_DATA]
        csv_path = path.join(dest_directory, resource_schema['resPath'])
        shutil.rmtree(dest_directory)
        shutil.copytree(workspace.d3m_config.training_data_root, dest_directory)
        os.remove(csv_path)
        writable_dataframe.to_csv(csv_path, index=False)

        return path.join(dest_directory, 'datasetDoc.json'), csv_path

    all_datasetDoc, all_datasetCsv = write_dataset('all', dataframe)
    train_datasetDoc, train_datasetCsv = write_dataset('train', splits['train'])
    test_datasetDoc, test_datasetCsv = write_dataset('test', splits['test'])

    dataset_docs = {
        'all': all_datasetDoc,
        'train': train_datasetDoc,
        'test': test_datasetDoc
    }

    dataset_paths = {
        'all': all_datasetCsv,
        'train': train_datasetCsv,
        'test': test_datasetCsv
    }

    return {
        'dataset_schemas': dataset_docs,
        'dataset_paths': dataset_paths,
        'stratified': splits['stratify']
    }


def create_destination_directory(user_workspace, name):
    """Used to add a write directory for the partials app"""
    if not isinstance(user_workspace, UserWorkspace):
        return err_resp('Error "user_workspace" must be a UserWorkspace object.')

    # build destination path for partials app
    dest_dir_path = os.path.join(user_workspace.d3m_config.additional_inputs,
                         name,
                         f'ws_{user_workspace.id}',
                         get_timestamp_string())

    new_dir_info = create_directory(dest_dir_path)
    if not new_dir_info.success:
        return {KEY_SUCCESS: False, KEY_DATA: f' {new_dir_info.err_msg} ({dest_dir_path})'}

    return {KEY_SUCCESS: True, KEY_DATA: dest_dir_path}



@celery_app.task
def create_partials_datasets(configuration, workspace):
    print(configuration)
    MAX_DATASET_SIZE = 50
    MAX_DOMAIN_SIZE = 100
    # load dataframe and dataset schema
    if 'dataset_schema_path' in configuration:
        dataset_schema = json.load(open(configuration['dataset_schema_path'], 'r'))
        dataset = Dataset.load(f'file://{configuration["dataset_schema_path"]}')
    elif 'dataset' in configuration:
        dataset_schema = configuration['dataset_schema']
        dataframe = pd.DataFrame(configuration['dataset'])
    else:
        return {KEY_SUCCESS: False, KEY_DATA: 'no dataset supplied'}

    resource_schema = next(i for i in dataset_schema['dataResources'] if i['resType'] == 'table')

    if 'dataset_schema_path' in configuration:
        dataframe = dataset[resource_schema['resID']]

    domains = configuration['domains']
    # METADATA OF SCHEMA:
    # {variable: [domain], ...}

    if len(dataframe) > MAX_DATASET_SIZE:
        return {KEY_SUCCESS: False, KEY_DATA: 'initial dataset too large to expand into partials'}

    def write_dataset(name, writable_dataframe):
        dest_dir_info = create_destination_directory(workspace, name=name)
        if not dest_dir_info[KEY_SUCCESS]:
            return dest_dir_info

        dest_directory = dest_dir_info[KEY_DATA]
        csv_path = os.path.join(dest_directory, resource_schema['resPath'])
        shutil.rmtree(dest_directory)
        shutil.copytree(workspace.d3m_config.training_data_root, dest_directory)
        os.remove(csv_path)
        writable_dataframe.to_csv(csv_path, index=False)

        return {KEY_SUCCESS: True, KEY_DATA: (path.join(dest_directory, 'datasetDoc.json'), csv_path)}

    dataset_schemas = {}
    dataset_paths = {}

    new_column_names = list(dataframe.columns.values)
    if 'd3mIndex' in new_column_names:
        d3mIndexIndex = new_column_names.index('d3mIndex')
        new_column_names[d3mIndexIndex] = str(new_column_names[d3mIndexIndex]) + 'Original'

    union_datasets = []
    for predictor in domains:
        synthetic_data = []
        predictor_idx = new_column_names.index(predictor)
        for row_idx in range(len(dataframe)):
            row = dataframe.iloc[row_idx].tolist()

            for support_member in domains[predictor][:MAX_DOMAIN_SIZE]:
                row_copy = list(row)
                row_copy[predictor_idx] = support_member
                synthetic_data.append(row_copy)

        synthetic_data = pd.DataFrame(synthetic_data, columns=new_column_names)

        if configuration['separate_variables']:
            synthetic_data.insert(0, 'd3mIndex', list(range(len(synthetic_data))))
            dataset_name = configuration['name'] + predictor

            result_write = write_dataset(dataset_name, synthetic_data)
            if not result_write[KEY_SUCCESS]:
                return result_write
            dataset_schema, dataset_path = result_write[KEY_DATA]

            dataset_schemas[dataset_name] = dataset_schema
            dataset_paths[dataset_name] = dataset_path
        else:
            union_datasets.append(synthetic_data)

    if union_datasets:
        synthetic_data = pd.concat(union_datasets)
        synthetic_data.insert(0, 'd3mIndex', list(range(len(synthetic_data))))

        result_write = write_dataset(configuration['name'], synthetic_data)
        if not result_write[KEY_SUCCESS]:
            return result_write
        dataset_schema, dataset_path = result_write[KEY_DATA]

        dataset_schemas[configuration['name']] = dataset_schema
        dataset_paths[configuration['name']] = dataset_path

    return {
        KEY_SUCCESS: True,
        KEY_DATA: {
            'dataset_schemas': dataset_schemas,
            'dataset_paths': dataset_paths
        }
    }
