from django.conf import settings

from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil
from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA

# import pyperclip
# import json
import random
import pandas as pd


def util_results_real_clustered(data_pointer, metadata):
    GRID_SIZE = 100
    response = EventJobUtil.import_dataset(
        settings.TWORAVENS_MONGO_DB_NAME,
        metadata['collectionName'],
        metadata['collectionPath'])

    if not response.success:
        return {KEY_SUCCESS: False, KEY_DATA: response.err_msg}

    results_collection_name = metadata['collectionName'] + '_produce_' + str(metadata['produceId'])

    mongo_util_base = MongoRetrieveUtil(
        settings.TWORAVENS_MONGO_DB_NAME,
        settings.MONGO_COLLECTION_PREFIX + metadata['collectionName'])
    if mongo_util_base.has_error():
        return {KEY_SUCCESS: False, KEY_DATA: mongo_util_base.get_error_message()}

    mongo_util_fitted = MongoRetrieveUtil(
        settings.TWORAVENS_MONGO_DB_NAME,
        settings.MONGO_COLLECTION_PREFIX + metadata['collectionName'])
    if mongo_util_fitted.has_error():
        return {KEY_SUCCESS: False, KEY_DATA: mongo_util_fitted.get_error_message()}

    def normalize(variable, minimum, maximum, scale=1):
        return {"$divide": [{"$subtract": [variable, minimum]}, (maximum - minimum) / scale]}

    try:
        status = EventJobUtil.import_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            results_collection_name,
            data_pointer,
            indexes=['d3mIndex'])

        if not status.success:
            return {KEY_SUCCESS: False, KEY_DATA: status.err_msg}

        # COMPUTE ACTUAL BOUNDS
        bounds = {}
        response = list(mongo_util_base.run_query([
            *metadata['query'],
            {"$group": {
                "_id": 0,
                **{f'min_{target}': {"$min": f"${target}"} for target in metadata['targets']},
                **{f'max_{target}': {"$max": f"${target}"} for target in metadata['targets']}
            }}
        ], method='aggregate'))

        if not response[0]:
            return {KEY_SUCCESS: response[0], KEY_DATA: response[1]}

        record = next(response[1])
        bounds['actual'] = {target: [
            record[f'min_{target}'],
            record[f'max_{target}']
        ] for target in metadata['targets']}

        # COMPUTE FITTED BOUNDS
        response = list(mongo_util_fitted.run_query([
            {"$group": {
                "_id": 0,
                **{f'min_{target}': {"$min": f"${target}"} for target in metadata['targets']},
                **{f'max_{target}': {"$max": f"${target}"} for target in metadata['targets']}
            }}
        ], method='aggregate'))

        if not response[0]:
            return {KEY_SUCCESS: response[0], KEY_DATA: response[1]}

        record = next(response[1])
        bounds['fitted'] = {target: [
            record[f'min_{target}'],
            record[f'max_{target}']
        ] for target in metadata['targets']}

        # GRID CLUSTERING
        query = [
            *metadata['query'],
            {
                "$project": {
                    **{
                        name: 1 for name in metadata['targets']
                    },
                    **{'d3mIndex': 1}
                }
            },
            {
                "$lookup": {
                    "from": settings.MONGO_COLLECTION_PREFIX + results_collection_name,
                    "localField": "d3mIndex",
                    "foreignField": "d3mIndex",
                    "as": "results_collection"
                }
            },
            {
                "$unwind": "$results_collection"
            },
            {
                "$project": {
                    **{
                        'fitted_' + name: f"$results_collection\\.{name}" for name in metadata['targets']
                    },
                    **{
                        'actual_' + name: f"${name}" for name in metadata['targets']
                    },
                    **{"_id": 0}}
            },
            {
                "$facet": {
                    target: [
                        {
                            "$group": {
                                "_id": {
                                    'x': {'$toInt': normalize(f'$fitted_{target}', *bounds['fitted'][target], GRID_SIZE)},
                                    'y': {'$toInt': normalize(f'$actual_{target}', *bounds['actual'][target], GRID_SIZE)}
                                },
                                'Fitted Values': {"$avg": f'$fitted_{target}'},
                                'Actual Values': {"$avg": f'$actual_{target}'},
                                'count': {'$sum': 1}
                            }
                        },
                        {'$project': {'_id': 0}}
                    ]
                    for target in metadata['targets']}
            }
        ]

        response = list(mongo_util_base.run_query(query, method='aggregate'))

    finally:
        pass
        # EventJobUtil.delete_dataset(
        #     settings.TWORAVENS_MONGO_DB_NAME,
        #     results_collection_name)

    return {KEY_SUCCESS: response[0], KEY_DATA: next(response[1]) if response[0] else response[1]}


def util_results_confusion_matrix(data_pointer, metadata):
    """Get the content from the file and format a JSON snippet
    that includes statistical summaries.
    """
    response = EventJobUtil.import_dataset(
        settings.TWORAVENS_MONGO_DB_NAME,
        metadata['collectionName'],
        metadata['collectionPath'])

    if not response.success:
        return {KEY_SUCCESS: False, KEY_DATA: response.err_msg}

    results_collection_name = metadata['collectionName'] + '_produce_' + str(metadata['produceId'])

    util = MongoRetrieveUtil(
        settings.TWORAVENS_MONGO_DB_NAME,
        settings.MONGO_COLLECTION_PREFIX + metadata['collectionName'])
    if util.has_error():
        return {KEY_SUCCESS: False, KEY_DATA: util.get_error_message()}

    query = [
        *metadata['query'],
        # minor optimization, drop unneeded columns before performing lookup
        {
            "$project": {
                **{
                    name: 1 for name in metadata['targets']
                },
                **{'d3mIndex': 1}
            }
        },
        {
            "$lookup": {
                "from": settings.MONGO_COLLECTION_PREFIX + results_collection_name,
                "localField": "d3mIndex",
                "foreignField": "d3mIndex",
                "as": "results_collection"
            }
        },
        {
            "$unwind": "$results_collection"
        },
        {
            "$project": {
                **{
                    'Predicted_' + name: f"$results_collection\\.{name}" for name in metadata['targets']
                },
                **{
                    'Actual_' + name: f"${name}" for name in metadata['targets']
                },
                **{"_id": 0}}
        },
        {
            '$facet': {
                target: [
                    {
                        "$group": {
                            '_id': {'Actual': f'$Actual_{target}', 'Predicted': f'$Predicted_{target}'},
                            'count': {'$sum': 1}
                        }
                    },
                    {
                        "$project": {
                            'Actual': '$_id\\.Actual',
                            'Predicted': '$_id\\.Predicted',
                            'count': 1,
                            '_id': 0
                        }
                    },
                    {
                        "$sort": {'Actual': 1}
                    }
                ] for target in metadata['targets']
            }
        }
    ]

    try:
        status = EventJobUtil.import_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            results_collection_name,
            data_pointer,
            indexes=['d3mIndex'])

        if not status.success:
            return {KEY_SUCCESS: False, KEY_DATA: status.err_msg}

        response = list(util.run_query(query, method='aggregate'))

    finally:
        EventJobUtil.delete_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            results_collection_name)

    if not response[0]:
        return {KEY_SUCCESS: response[0], KEY_DATA: response[1]}

    data = next(response[1])

    return {
        KEY_SUCCESS: response[0],
        KEY_DATA: {
            target: {
                'data': data[target],
                'classes': list(set(map(lambda x: x['Actual'], data[target])))
            } for target in data.keys()
        }
    }


def util_results_importance_efd(data_pointer, metadata):
    LIMIT_UNIQUE_LEVELS = 20

    # make sure the base dataset is loaded
    EventJobUtil.import_dataset(
        settings.TWORAVENS_MONGO_DB_NAME,
        metadata['collectionName'],
        data_path=metadata['collectionPath'])

    results_collection_name = metadata['collectionName'] + '_produce_' + str(metadata['produceId'])

    util = MongoRetrieveUtil(
        settings.TWORAVENS_MONGO_DB_NAME,
        settings.MONGO_COLLECTION_PREFIX + metadata['collectionName'])
    if util.has_error():
        return {KEY_SUCCESS: False, KEY_DATA: util.get_error_message()}

    levels = {}
    # populate levels (for example, numeric column tagged as categorical)
    for variable in metadata['categoricals']:
        # levels are passed, but levels have lost type information (json object keys are coerced to string)
        # if not levels[key]:
        response = util.run_query([
            *metadata['query'],
            {"$group": {"_id": f"${variable}", "count": {'$sum': 1}}},
            {'$sort': {'count': -1, '_id': 1}},
            {"$limit": LIMIT_UNIQUE_LEVELS}
        ], 'aggregate')

        if not response[0]:
            return {KEY_SUCCESS: False, KEY_DATA: response[1]}
        levels[variable] = [doc['_id'] for doc in response[1]]

        # limit the number of unique levels
        if len(levels[variable]) > LIMIT_UNIQUE_LEVELS:
            levels[variable] = levels[variable][:LIMIT_UNIQUE_LEVELS]

    # fitted versions of variables have same levels as their originals
    levels.update({
        'fitted ' + key: levels[key] for key in levels
    })
    # renamed variables have the same levels as their originals
    levels.update({
        'actual ' + key: levels[key] for key in levels
    })

    # print('metadata levels', levels)

    def is_categorical(variable, levels):
        return variable in levels

    def branch_target(variable, levels):
        if is_categorical(variable, levels):
            return {f'{variable}-{level}': {
                "$avg": {"$cond": [{"$eq": [f"${variable}", level]}, 1, 0]}
            } for level in levels[variable]}
        # compute mean of fitted and actual
        return {
            f'fitted {variable}': {"$avg": f'$fitted {variable}'},
            f'actual {variable}': {"$avg": f'$actual {variable}'},
            'error': {'$sum': {"$pow": [{'$subtract': [f'$fitted {variable}', f'$actual {variable}']}, 2]}}
        }

    def aggregate_targets(variables, levels):
        return {k: v for d in
                [branch_target(target, levels) for target in variables]
                for k, v in d.items()}

    def branch_target_levels(variable, levels):
        if is_categorical(variable, levels):
            return {
                f'{variable}-{level}': {
                    "$avg": {"$cond": [{"$eq": [f"${variable}", level]}, 1, 0]}
                } for level in levels[variable]}
        return {variable: {"$avg": f'${variable}'}}

    def aggregate_target_levels(variables, levels):
        return {k: v for d in [
            *[branch_target_levels('fitted ' + target, levels) for target in variables],
            *[branch_target_levels('actual ' + target, levels) for target in variables]
        ] for k, v in d.items()}

    target_aggregator = aggregate_target_levels(metadata['targets'], levels)

    query = [
        *metadata['query'],
        {
            "$lookup": {
                "from": settings.MONGO_COLLECTION_PREFIX + results_collection_name,
                "localField": "d3mIndex",
                "foreignField": "d3mIndex",
                "as": "results_collection"
            }
        },
        {
            "$unwind": "$results_collection"
        },
        {
            "$project": {
                **{
                    'fitted ' + name: f"$results_collection\\.{name}" for name in metadata['targets']
                },
                **{
                    'actual ' + name: f"${name}" for name in metadata['targets']
                },
                **{
                    predictor: 1 for predictor in metadata['predictors']
                },
                **{"_id": 0}}
        },
        {
            "$facet": {
                predictor: [
                    {
                        "$group": {
                            **{"_id": f'${predictor}', 'count': {"$sum": 1}},
                            **target_aggregator
                        }
                    },
                    {
                        "$sort": {"count": -1, '_id': 1}
                    },
                    {
                        "$limit": 20
                    },
                    {
                        "$project": {
                            **{predictor: "$_id"},
                            **{k: 1 for k in target_aggregator.keys()},
                            **{"_id": 0}
                        }
                    }
                ] if is_categorical(predictor, levels) else [
                    {
                        "$bucketAuto": {
                            "groupBy": f'${predictor}',
                            "buckets": 100,
                            "output": target_aggregator
                        }
                    },
                    {
                        "$project": {
                            **{predictor: {"$avg": ["$_id\\.min", "$_id\\.max"]}},
                            **{k: 1 for k in target_aggregator.keys()},
                            **{"_id": 0}
                        }
                    }
                ] for predictor in metadata['predictors']
            }
        },
    ]

    try:
        status = EventJobUtil.import_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            results_collection_name,
            data_pointer)

        if not status.success:
            return {KEY_SUCCESS: False, KEY_DATA: status.err_msg}

        response = list(util.run_query(query, method='aggregate'))

        if not response[0]:
            return {
                KEY_SUCCESS: response[0],
                KEY_DATA: response[1]
            }

        # exhaust cursor before dropping dataset
        data = next(response[1])

    finally:
        pass
        # EventJobUtil.delete_dataset(
        #     settings.TWORAVENS_MONGO_DB_NAME,
        #     results_collection_name)

    def kernel_linear(size):
        return list(range(1, size // 2 + 2)) + list(range(size // 2, 0, -1))

    def kernel_uniform(size):
        return [1] * size

    def smooth(kernel, data, predictor):
        if len(kernel) % 2 != 1:
            raise ValueError('Kernel must be odd-length')
        # normalize kernel
        kernel = [i / sum(kernel) for i in kernel]

        # clip indices for data access on kernel offsets at edges
        def clip(x):
            return max(0, min(len(data) - 1, x))

        offset = len(kernel) // 2
        smoothed = []
        for i in range(len(data)):
            smoothed.append({
                **{
                    level: sum(weight * data[clip(i + j_level - offset)][level]
                               for j_level, weight in enumerate(kernel))
                    for level in data[i].keys() if level != predictor
                },
                **{predictor: data[i][predictor]}
            })
        return smoothed

    # pyperclip.copy(json.dumps({"query": query, "data": data}, indent=4))
    for predictor in metadata['predictors']:
        if not is_categorical(predictor, levels):
            data[predictor] = smooth(kernel_linear(size=7), data[predictor], predictor)

    return {
        KEY_SUCCESS: True,
        KEY_DATA: data
    }


def util_results_importance_ice(data_pointer_X, data_pointer_Y, variable):
    return pd.read_csv(data_pointer_X)[['d3mIndex', variable, 'd3mIndexOriginal']].merge(
        pd.read_csv(data_pointer_Y),
        left_on='d3mIndex',
        right_on='d3mIndex',
        how='inner').drop(columns=['d3mIndex']).to_dict('records')
