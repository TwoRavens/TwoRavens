from django.db import models
from django.conf import settings
import math
import sklearn.metrics

SAVED_MODELS_PATH = '/ravens_volume/solvers/models/'
EXPORTED_MODELS_PATH = '/ravens_volume/solvers/exported/'

R_SERVICE = settings.R_DEV_SERVER_BASE  #'http://0.0.0.0:8000/'

KEY_SUCCESS = 'success'
KEY_DATA = 'data'
KEY_MSG_TYPE = 'msg_type'
KEY_WEBSOCKET_ID = 'websocket_id'
KEY_MESSAGE = 'message'

RECEIVE_SOLVE_MSG = 'receive_solve_msg'
RECEIVE_SEARCH_MSG = 'receive_search_msg'
RECEIVE_DESCRIBE_MSG = 'receive_describe_msg'
RECEIVE_SCORE_MSG = 'receive_score_msg'
RECEIVE_PRODUCE_MSG = 'receive_produce_msg'
RECEIVE_ERROR_MSG = 'receive_error_msg'


def get_metric(specification):
    if specification['metric'] == "ACCURACY":
        return sklearn.metrics.accuracy_score
    if specification['metric'] == "PRECISION":
        return lambda actual, predicted: sklearn.metrics.precision_score(
            actual, predicted, positive_label=specification.get('positiveLabel', 1))
    if specification['metric'] == "RECALL":
        return lambda actual, predicted: sklearn.metrics.recall_score(
            actual, predicted, positive_label=specification.get('positiveLabel', 1))
    if specification['metric'] == "F1":
        return lambda actual, predicted: sklearn.metrics.f1_score(
            actual, predicted, positive_label=specification.get('positiveLabel', 1))
    if specification['metric'] == "F1_MICRO":
        return lambda actual, predicted: sklearn.metrics.f1_score(actual, predicted, average="micro")
    if specification['metric'] == "F1_MACRO":
        return lambda actual, predicted: sklearn.metrics.f1_score(actual, predicted, average="macro")
    if specification['metric'] == "ROC_AUC":
        return sklearn.metrics.roc_auc_score
    if specification['metric'] == "ROC_AUC_MICRO":
        return lambda actual, predicted: sklearn.metrics.roc_auc_score(actual, predicted, average="micro")
    if specification['metric'] == "ROC_AUC_MACRO":
        return lambda actual, predicted: sklearn.metrics.roc_auc_score(actual, predicted, average="macro")
    if specification['metric'] == 'ROOT_MEAN_SQUARED_ERROR':
        return lambda actual, predicted: math.sqrt(sklearn.metrics.mean_squared_error(actual, predicted))
    if specification['metric'] == "MEAN_SQUARED_ERROR":
        return sklearn.metrics.mean_squared_error
    if specification['metric'] == "MEAN_ABSOLUTE_ERROR":
        return sklearn.metrics.mean_absolute_error
    if specification['metric'] == "R_SQUARED":
        return sklearn.metrics.r2_score
    if specification['metric'] == "JACCARD_SIMILARITY_SCORE":
        return sklearn.metrics.jaccard_similarity_score
    if specification['metric'] == "PRECISION_AT_TOP_K":
        raise NotImplementedError
    if specification['metric'] == "OBJECT_DETECTION_AVERAGE_PRECISION":
        raise NotImplementedError
    if specification['metric'] == "HAMMING_LOSS":
        return sklearn.metrics.hamming_loss
    if specification['metric'] == "RANK":
        raise NotImplementedError

    raise NotImplementedError


def should_maximize(specification):
    if specification['metric'] in [
        'ACCURACY', 'PRECISION', 'RECALL',
        'F1', 'F1_MICRO', 'F1_MACRO',
        'ROC_AUC', 'ROC_AUC_MICRO', 'ROC_AUC_MACRO',
        'R_SQUARED', 'JACCARD_SIMILARITY_SCORE',
        'PRECISION_AT_TOP_K', 'OBJECT_DETECTION_AVERAGE_PRECISION']:
        return True
    if specification['metric'] in [
        'MEAN_SQUARED_ERROR', 'MEAN_ABSOLUTE_ERROR',
        'HAMMING_LOSS', 'RANK']:
        return False

    raise NotImplementedError


class StatisticalModel(models.Model):
    model_id = models.AutoField(primary_key=True)
    created_on = models.DateTimeField(auto_now_add=True)
    user = models.CharField(max_length=256)

    class Meta:
        ordering = ['created_on']
