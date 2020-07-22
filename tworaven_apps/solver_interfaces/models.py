from django.db import models
from django.conf import settings
import math
import sklearn.metrics as smetrics

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


def get_metric(specification, aux_info=None):
    def get_pos_label(classes_list):
        # If 1 or True exist in the classes list, set it as pos_label
        for item in classes_list:
            if item == '1' or item.lower == 'true':
                return item
        return None

    if specification['metric'] == "ACCURACY":
        return smetrics.accuracy_score
    if specification['metric'] == "PRECISION":
        cls_list = aux_info.get('clf_classes', None)
        pos_label = get_pos_label(cls_list)
        assert cls_list is not None, "Classes List should be available for classification task"

        if len(cls_list) <= 2:
            # Binary cls
            return lambda actual, predicted: smetrics.precision_score(
                actual, predicted,
                labels=cls_list,
                pos_label=pos_label if pos_label else cls_list[1],
                average='binary')
        else:
            # Multi-class
            return lambda actual, predicted: smetrics.precision_score(
                actual, predicted,
                labels=cls_list,
                average='macro')

    if specification['metric'] == "RECALL":
        cls_list = aux_info.get('clf_classes', None)
        pos_label = get_pos_label(cls_list)
        assert cls_list is not None, "Classes List should be available for classification task"

        if len(cls_list) <= 2:
            # Binary cls
            return lambda actual, predicted: smetrics.recall_score(
                actual, predicted,
                labels=cls_list,
                pos_label=pos_label if pos_label else cls_list[1],
                average='binary')
        else:
            # Multi-class
            return lambda actual, predicted: smetrics.recall_score(
                actual, predicted,
                labels=cls_list,
                average='macro')

    if specification['metric'] in ["F1", "F1_MICRO", "F1_MACRO"]:
        cls_list = aux_info.get('clf_classes', None)
        pos_label = get_pos_label(cls_list)
        assert cls_list is not None, "Classes List should be available for classification task"

        if len(cls_list) <= 2:
            # Binary cls
            return lambda actual, predicted: smetrics.f1_score(
                actual, predicted,
                labels=cls_list,
                pos_label=pos_label if pos_label else cls_list[1],
                average='binary')
        else:
            # Multi-class
            return lambda actual, predicted: smetrics.f1_score(
                actual, predicted,
                labels=cls_list,
                average='micro' if specification["metric"] == "F1_MICRO" else 'macro')

    if specification['metric'] in ["ROC_AUC", "ROC_AUC_MICRO", "ROC_AUC_MACRO"]:
        cls_list = aux_info.get('clf_classes', None)
        pos_label = get_pos_label(cls_list)
        assert cls_list is not None, "Classes List should be available for classification task"

        if len(cls_list) <= 2:
            # Binary cls
            return lambda actual, predicted: smetrics.roc_auc_score(
                actual, predicted,
                labels=cls_list,
                average='micro' if specification['metric'] == "ROC_AUC_MICRO" else 'macro')
        else:
            # Multi-class
            return lambda actual, predicted: smetrics.roc_auc_score(
                actual, predicted,
                labels=cls_list,
                average='micro' if specification['metric'] == "ROC_AUC_MICRO" else 'macro',
                multi_class='ovr')

    if specification['metric'] == 'ROOT_MEAN_SQUARED_ERROR':
        return lambda actual, predicted: math.sqrt(smetrics.mean_squared_error(actual, predicted))
    if specification['metric'] == "MEAN_SQUARED_ERROR":
        return smetrics.mean_squared_error
    if specification['metric'] == "MEAN_ABSOLUTE_ERROR":
        return smetrics.mean_absolute_error
    if specification['metric'] == "R_SQUARED":
        return smetrics.r2_score
    if specification['metric'] == "JACCARD_SIMILARITY_SCORE":
        return smetrics.jaccard_score
    if specification['metric'] == "PRECISION_AT_TOP_K":
        raise NotImplementedError
    if specification['metric'] == "OBJECT_DETECTION_AVERAGE_PRECISION":
        raise NotImplementedError
    if specification['metric'] == "HAMMING_LOSS":
        return smetrics.hamming_loss
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
