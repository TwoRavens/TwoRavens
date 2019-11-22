from django.conf import settings

from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil
from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA

# import pyperclip
# import json
import random


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
                    'fitted_' + name: f"$results_collection\\.{name}" for name in metadata['targets']
                },
                **{
                    'actual_' + name: f"${name}" for name in metadata['targets']
                },
                **{"_id": 0}}
        },
        {
            '$facet': {
                target: [
                    {
                        "$group": {
                            '_id': {'actual': f'$actual_{target}', 'fitted': f'$fitted_{target}'},
                            'count': {'$sum': 1}
                        }
                    },
                    {
                        "$project": {
                            'actual': '$_id\\.actual',
                            'fitted': '$_id\\.fitted',
                            'count': 1,
                            '_id': 0
                        }
                    },
                    {
                        "$sort": {'actual': 1}
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

    target_matrices = {}

    for target in metadata['targets']:
        target_matrices[target] = {}

        # populate 2D sparse data structure
        for cell in next(response[1])[target]:
            # construct row if not exists
            if not cell['actual'] in target_matrices[target]:
                target_matrices[target][cell['actual']] = {}

            target_matrices[target][cell['actual']][cell['fitted']] = cell['count']

        labels = list(target_matrices[target].keys())

        # convert to dense matrix
        target_matrices[target] = {
            "data": [
                [target_matrices[target][actual].get(fitted, 0) for fitted in labels]
                for actual in labels
            ],
            "classes": labels
        }

    return {KEY_SUCCESS: response[0], KEY_DATA: target_matrices}


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

    # populate levels if not passed (for example, numeric column tagged as categorical)
    for key in metadata['levels']:
        # levels are passed, but levels have lost type information (json object keys are coerced to string)
        # if not metadata['levels'][key]:
        response = util.run_query([
            *metadata['query'],
            {"$group": {"_id": f"${key}", "count": {'$sum': 1}}},
            {'$sort': {'count': -1}},
            {"$sample": {"size": LIMIT_UNIQUE_LEVELS}}
        ], 'aggregate')

        if not response[0]:
            return {KEY_SUCCESS: False, KEY_DATA: response[1]}
        metadata['levels'][key] = [doc['_id'] for doc in response[1]]

        # limit the number of unique levels
        if len(metadata['levels'][key]) > LIMIT_UNIQUE_LEVELS:
            metadata['levels'][key] = random.sample(metadata['levels'][key], k=LIMIT_UNIQUE_LEVELS)

    # fitted versions of variables have same levels as their originals
    metadata['levels'].update({
        'fitted ' + key: metadata['levels'][key] for key in metadata['levels']
    })
    # renamed variables have the same levels as their originals
    metadata['levels'].update({
        'actual ' + key: metadata['levels'][key] for key in metadata['levels']
    })

    # print('metadata levels', metadata['levels'])

    def is_categorical(variable, levels):
        return variable in levels

    def branch_target(variable, levels):
        if is_categorical(variable, levels):
            return {f'{variable}-{level}': {
                "$avg": {"$cond": [{"$eq": [f"${variable}", level]}, 1, 0]}
            } for level in metadata['levels'][variable]}
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
                } for level in metadata['levels'][variable]}
        return {variable: {"$avg": f'${variable}'}}

    def aggregate_target_levels(variables, levels):
        return {k: v for d in [
            *[branch_target_levels('fitted ' + target, levels) for target in variables],
            *[branch_target_levels('actual ' + target, levels) for target in variables]
        ] for k, v in d.items()}

    target_aggregator = aggregate_target_levels(metadata['targets'], metadata['levels'])

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
                            **{"_id": f'${predictor}'},
                            **target_aggregator
                        }
                    },
                    {
                        "$project": {
                            **{predictor: "$_id"},
                            **{k: 1 for k in target_aggregator.keys()},
                            **{"_id": 0}
                        }
                    }
                ] if is_categorical(predictor, metadata['levels']) else [
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

    finally:
        pass
        # EventJobUtil.delete_dataset(
        #     settings.TWORAVENS_MONGO_DB_NAME,
        #     results_collection_name)

    if not response[0]:
        return {
            KEY_SUCCESS: response[0],
            KEY_DATA: response[1]
        }

    data = next(response[1])

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
        if not is_categorical(predictor, metadata['levels']):
            data[predictor] = smooth(kernel_linear(size=7), data[predictor], predictor)

    return {
        KEY_SUCCESS: True,
        KEY_DATA: data
    }

