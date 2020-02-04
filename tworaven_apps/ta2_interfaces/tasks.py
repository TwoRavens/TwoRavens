"""
send a gRPC command that has streaming results
capture the results in the db as StoredResponse objects
"""

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

from sklearn.model_selection import train_test_split
import pandas as pd
from pandas.api.types import is_numeric_dtype

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

from tworaven_solver import approx_seconds, get_date
import csv
from dateutil import parser
from collections import deque


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

    split_options = configuration.get('split_options', {})
    problem = configuration.get('problem')

    dataset_schema = json.load(open(configuration['dataset_schema'], 'r'))
    resource_schema = next(i for i in dataset_schema['dataResources'] if i['resType'] == 'table')

    keep_variables = None
    cross_section_date_limits = None
    inferred_freq = None
    dtypes = {}
    # rewrite datasetDoc in output datasets if new problem metadata is supplied
    keep_variables = list({
        *problem.get('indexes', ['d3mIndex']),
        *problem['predictors'],
        *problem['targets']
    })
    all_variables = pd.read_csv(configuration['dataset_path'], nrows=1).columns.tolist()
    # preserve column order, and only keep variables that already existed
    keep_variables = sorted(list(i for i in keep_variables if i in all_variables), key=lambda x: all_variables.index(x))

    passthrough_roles = [
        'multiIndex', 'key', 'interval', 'boundingPolygon',
        'edgeSource', "directedEdgeSource", "undirectedEdgeSource", "multiEdgeSource", "simpleEdgeSource",
        "edgeTarget", "directedEdgeTarget", "undirectedEdgeTarget", "multiEdgeTarget", "simpleEdgeTarget"
    ]

    map_roles = {
        "indexes": 'index',
        'predictors': 'attribute',
        'targets': 'suggestedTarget',
        'crossSection': 'suggestedGroupingKey',
        'location': 'locationIndicator',
        'boundary': 'boundaryIndicator',
        'time': 'timeIndicator',
        'weights': 'instanceWeight',
        'privileged': 'suggestedPriviligedData'
    }

    def update_roles(prev_roles, col_name):
        roles = [i for i in prev_roles if i in passthrough_roles]

        for role_name in map_roles:
            if col_name in problem[role_name]:
                roles.append(map_roles[role_name])

        return roles

    def update_col_schema(i, col_name):
        col_schema = next(col_schema for col_schema in resource_schema['columns'] if col_schema['colName'] == col_name)
        col_schema['colIndex'] = i
        if configuration.get('update_roles'):
            col_schema['role'] = update_roles(col_schema['role'], col_name)
        return col_schema

    # modify in place
    resource_schema['columns'] = [update_col_schema(i, col_name) for i, col_name in enumerate(keep_variables)]

    # WARNING: dates are assumed to be monotonically increasing
    if problem.get('taskType') == 'FORECASTING' and problem.get('time'):
        time_column = problem['time'][0]
        dtypes[time_column] = str
        for cross_section in problem.get('crossSection', []):
            dtypes[cross_section] = str

        time_format = problem.get('time_format')

        cross_section_date_limits = {}
        time_buffer = []
        candidate_frequencies = set()

        data_file_generator = pd.read_csv(
            configuration['dataset_path'],
            chunksize=10 ** 5,
            usecols=keep_variables,
            dtype=dtypes)

        infer_count = 0
        for dataframe_chunk in data_file_generator:

            dataframe_chunk[time_column] = dataframe_chunk[time_column].apply(
                lambda x: get_date(x, time_format=time_format))
            dataframe_chunk = dataframe_chunk.sort_values(by=[time_column])

            for _, row in dataframe_chunk.iterrows():
        # with open(configuration['dataset_path'], 'r') as infile:
        #     reader = csv.DictReader(infile)
        #     for row in reader:
                date = row[time_column]
                if not date:
                    continue

                # infer frequency up to 100 times
                if infer_count < 1000000:

                    buffer_is_empty = len(time_buffer) == 0
                    date_is_newer = len(time_buffer) > 0 and time_buffer[-1] < date

                    if buffer_is_empty or date_is_newer:
                        time_buffer.append(date)
                        if len(time_buffer) > 3:
                            del time_buffer[0]

                        # at minimum three time points are needed to infer a date offset frequency
                        if len(time_buffer) == 3:
                            infer_count += 1
                            candidate_frequency = pd.infer_freq(time_buffer)
                            if candidate_frequency:
                                candidate_frequencies.add(candidate_frequency)

                # collect the highest date within each cross section
                section = tuple(row[col] for col in problem.get('crossSection', []))
                cross_section_date_limits.setdefault(section, date)
                cross_section_date_limits[section] = max(cross_section_date_limits[section], date)

        # if data has a trio of evenly spaced records
        if candidate_frequencies:
            # sort inferred frequency by approximate time durations, select shortest
            inferred_freq = sorted([(i, approx_seconds(i)) for i in candidate_frequencies], key=lambda x: x[1])[0][0]
            inferred_freq = pd.tseries.frequencies.to_offset(inferred_freq)


    def get_dataset_paths(role):
        dest_dir_info = create_destination_directory(workspace, name=role)
        if not dest_dir_info[KEY_SUCCESS]:
            return JsonResponse(get_json_error(dest_dir_info.err_msg))

        dest_directory = dest_dir_info[KEY_DATA]
        csv_path = path.join(dest_directory, resource_schema['resPath'])
        shutil.rmtree(dest_directory)
        shutil.copytree(workspace.d3m_config.training_data_root, dest_directory)
        os.remove(csv_path)

        with open(path.join(dest_directory, 'datasetDoc.json'), 'w') as dataset_schema_file:
            json.dump(dataset_schema, dataset_schema_file)

        return path.join(dest_directory, 'datasetDoc.json'), csv_path

    all_datasetDoc, all_datasetCsv = get_dataset_paths('all')
    dataset_schemas = {'all': all_datasetDoc}
    dataset_paths = {'all': all_datasetCsv}
    dataset_stratified = {}

    if split_options.get('outOfSampleSplit'):
        train_datasetDoc, train_datasetCsv = get_dataset_paths('train')
        test_datasetDoc, test_datasetCsv = get_dataset_paths('test')

        dataset_schemas = {
            **dataset_schemas,
            'train': train_datasetDoc,
            'test': test_datasetDoc
        }

        dataset_paths = {
            **dataset_paths,
            'train': train_datasetCsv,
            'test': test_datasetCsv,
        }

        dataset_stratified = {
            'train': split_options.get('stratified'),
            'test': split_options.get('stratified')
        }

    DEFAULT_RATIO = .7
    train_test_ratio = split_options.get('trainTestRatio', DEFAULT_RATIO)
    if not (0 >= train_test_ratio > 1):
        train_test_ratio = DEFAULT_RATIO

    random_seed = split_options.get('randomSeed', 0)

    with open(configuration['dataset_path'], 'r') as infile:
        header_line = next(infile)
        row_count = sum(1 for _ in infile)

    for split_name in ['train', 'test', 'all']:
        pd.DataFrame(data=[], columns=keep_variables).to_csv(dataset_paths[split_name], index=False)

    # by default, the split is trivially forever None, which exhausts all zips
    splits_file_generator = iter(lambda: None, 1)
    if split_options.get('splitsDir') and split_options.get('splitsFile'):
        splits_file_path = f"{split_options['splitsDir']}/{split_options['splitsFile']}"
        splits_file_generator = pd.read_csv(splits_file_path, chunksize=10 ** 5)

    data_file_generator = pd.read_csv(
        configuration['dataset_path'],
        chunksize=10 ** 5,
        usecols=keep_variables,
        dtype=dtypes)
    row_count_chunked = 0

    # TODO: adjust chunksize based on number of columns
    for dataframe, dataframe_split in zip(
            data_file_generator,
            splits_file_generator):

        # rows with NaN values become object rows, which may contain multiple types. The NaN values become empty strings
        # this converts '' to np.nan in non-nominal columns, so that nan may be dropped
        # perhaps in a future version of d3m, the dataset loader could use pandas extension types instead of objects
        # nominals = problem.get('categorical', [])
        # for column in [col for col in dataframe.columns.values if col not in nominals]:
        #     dataframe[column].replace('', np.nan, inplace=True)
        #
        # dataframe.dropna(inplace=True)
        # dataframe.reset_index(drop=True, inplace=True)

        # max count of each split ['all', 'test', 'train']
        max_count = int(split_options.get('maxRecordCount', 5e4))
        chunk_count = len(dataframe)
        sample_count = int(max_count / row_count * chunk_count)

        if split_options.get('outOfSampleSplit'):
            if dataframe_split:
                train_indices = set(dataframe_split[dataframe_split['type'] == 'TRAIN']['d3mIndex'].tolist())
                test_indices = set(dataframe_split[dataframe_split['type'] == 'TEST']['d3mIndex'].tolist())

                splits = {
                    'train': dataframe[dataframe['d3mIndex'].astype(int).isin(train_indices)],
                    'test': dataframe[dataframe['d3mIndex'].astype(int).isin(test_indices)],
                    'stratified': False
                }

            # split dataset along temporal variable
            elif problem['taskType'] == 'FORECASTING':
                horizon = problem.get('forecastingHorizon', {}).get('value', 10)
                if not horizon:
                    horizon = 10

                if cross_section_date_limits and inferred_freq:
                    time_format = problem.get('time_format')
                    time_column = problem['time'][0]

                    cross_section_max_count = int(max_count / len(cross_section_date_limits))
                    horizon = min(cross_section_max_count, horizon)

                    def in_test(row):
                        section = tuple(row[col] for col in problem.get('crossSection', []))
                        date = get_date(row[time_column], time_format)
                        if not date:
                            return False
                        max_date = cross_section_date_limits[section]
                        # print('interval:', max_date - inferred_freq * horizon, max_date)
                        return max_date - inferred_freq * horizon <= date <= max_date

                    def in_train(row):
                        section = tuple(row[col] for col in problem.get('crossSection', []))
                        date = get_date(row[time_column], time_format)
                        if not date:
                            return False
                        max_date = cross_section_date_limits[section] - inferred_freq * horizon
                        # TODO: lower bound isn't being set, due to risk of time underflow
                        return date < max_date

                    splits = {
                        'train': dataframe.loc[dataframe.apply(in_train, axis=1)],
                        'test': dataframe.loc[dataframe.apply(in_test, axis=1)],
                        'stratified': False
                    }
                else:
                    train_idx_min = row_count - max_count - horizon
                    test_idx_min = row_count - horizon

                    def clamp(idx):
                        return min(len(dataframe), max(0, int(idx)))

                    splits = {
                        'train': dataframe.iloc[
                                 clamp(train_idx_min - row_count_chunked)
                                 :clamp(test_idx_min - row_count_chunked)],
                        'test': dataframe.iloc[
                                clamp(test_idx_min - row_count_chunked)
                                :clamp(len(dataframe))],
                        'stratified': False
                    }

            else:
                shuffle = split_options.get('shuffle', True)
                stratified = split_options.get('stratified')

                def run_split():
                    try:
                        dataframe_train, dataframe_test = train_test_split(
                            dataframe,
                            train_size=train_test_ratio,
                            shuffle=shuffle,
                            stratified=stratified,
                            random_state=random_seed)
                        return {'train': dataframe_train, 'test': dataframe_test, 'stratified': stratified}
                    except TypeError:
                        dataframe_train, dataframe_test = train_test_split(
                            dataframe,
                            shuffle=shuffle,
                            train_size=train_test_ratio,
                            random_state=random_seed)
                        return {'train': dataframe_train, 'test': dataframe_test, 'stratified': False}

                splits = run_split()

            for split_name in ['train', 'test']:
                if problem['taskType'] != 'FORECASTING':
                    if sample_count < len(splits[split_name]):
                        splits[split_name] = splits[split_name].sample(sample_count)

                splits[split_name].to_csv(dataset_paths[split_name], mode='a', header=False, index=False)
                dataset_stratified[split_name] = dataset_stratified[split_name] and splits['stratified']

        row_count_chunked += len(dataframe)
        if problem['taskType'] != 'FORECASTING':
            if sample_count < chunk_count:
                dataframe = dataframe.sample(sample_count)

        dataframe.to_csv(dataset_paths['all'], mode='a', header=False, index=False)

    def get_mode(x):
        mode = pd.Series.mode(x)
        if len(mode):
            return mode[0]
    # aggregate so that each cross section contains one observation at each time point
    if problem.get('taskType') == 'FORECASTING' and problem.get('time'):
        for split_name in dataset_paths:

            # data no longer needs to be chunked, it should be small enough (unless there are a large number of dupe records)
            dataframe = pd.read_csv(
                dataset_paths[split_name],
                dtype=dtypes)

            key_order = dataframe.columns.values

            group_keys = [problem['time'][0], *problem.get('crossSection', [])]
            other_keys = [i for i in dataframe.columns.values if i not in group_keys]

            grouped = dataframe.groupby(group_keys)
            aggregated = grouped.aggregate(
                {variable: pd.Series.mean if is_numeric_dtype(variable) else get_mode
                 for variable in other_keys})
            aggregated.reset_index(inplace=True)

            # reindex if aggregation shortened the dataframe
            if len(dataframe) != len(aggregated):
                aggregated[problem['indexes'][0]] = range(len(aggregated))

            aggregated = aggregated.reindex(columns=key_order, copy=False)
            aggregated.to_csv(dataset_paths[split_name], index=False)

    return {
        'dataset_schemas': dataset_schemas,
        'dataset_paths': dataset_paths,
        'stratified': dataset_stratified
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
def create_partials_datasets(configuration, workspace_id):
    """Create partials datasets"""
    print(configuration)

    try:
        workspace = UserWorkspace.objects.get(pk=workspace_id)
    except UserWorkspace.DoesNotExist:
        return {
            KEY_SUCCESS: False,
            KEY_DATA: f' UserWorkspace not found for id {workspace_id}.'
        }

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
