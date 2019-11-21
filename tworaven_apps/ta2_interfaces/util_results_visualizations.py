from django.conf import settings

from tworaven_apps.eventdata_queries.event_job_util import EventJobUtil
from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA


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

    print(response)

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
    # make sure the base dataset is loaded
    EventJobUtil.import_dataset(
        settings.TWORAVENS_MONGO_DB_NAME,
        metadata['collectionName'],
        datafile=metadata['collectionPath'])

    results_collection_name = metadata['collectionName'] + '_produce_' + str(metadata['produceId'])

    util = MongoRetrieveUtil(
        settings.TWORAVENS_MONGO_DB_NAME,
        settings.MONGO_COLLECTION_PREFIX + metadata['collectionName'])
    if util.has_error():
        return {KEY_SUCCESS: False, KEY_DATA: util.get_error_message()}

    # populate levels if not passed (for example, numeric column tagged as categorical)
    for key in metadata['levels']:
        if not metadata['levels'][key]:
            response = util.run_query([
                *metadata['query'],
                {"$group": {"_id": f"${key}"}},
            ], 'aggregate')

            if not response[0]:
                return {KEY_SUCCESS: False, KEY_DATA: response[1]}
            metadata['levels'][key] = [doc['_id'] for doc in response[1]]

    metadata['levels'].update({
        'fitted ' + key: metadata['levels'][key] for key in metadata['levels']
    })

    def is_categorical(variable, levels):
        return variable in levels

    def branch_target(variable, levels):
        if is_categorical(variable, levels):
            return {
                f'{variable}-{level}': {
                    "$avg": {"$cond": [{"$eq": [f"${variable}", level]}, 1, 0]}
                } for level in metadata['levels'][variable]}
        return {variable: {"$avg": f'${variable}'}}

    def aggregate_targets(variables, levels):
        return {k: v for d in [
            *[branch_target('fitted ' + target, levels) for target in variables],
            *[branch_target('actual ' + target, levels) for target in variables]
        ] for k, v in d.items()}

    target_aggregator = aggregate_targets(metadata['targets'], metadata['levels'])

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

    print(query)

    try:
        status = EventJobUtil.import_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            results_collection_name,
            data_pointer)

        if not status.success:
            return {KEY_SUCCESS: False, KEY_DATA: status.err_msg}

        response = list(util.run_query(query, method='aggregate'))

    finally:
        EventJobUtil.delete_dataset(
            settings.TWORAVENS_MONGO_DB_NAME,
            results_collection_name)

    return {
        KEY_SUCCESS: response[0],
        KEY_DATA: next(response[1]) if response[0] else response[1]
    }
