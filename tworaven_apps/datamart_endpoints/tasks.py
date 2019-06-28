import json
from tworavensproject.celery import celery_app
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)

from tworaven_apps.datamart_endpoints.forms import \
    (DatamartAugmentForm,)
from tworaven_apps.datamart_endpoints.materialize_util import MaterializeUtil
from tworaven_apps.datamart_endpoints.augment_util import AugmentUtil


def make_materialize_call(datamart_name, user_workspace_id, datamart_params, **kwargs):
    """Initiate the materialize call
    If successful, an async process is kicked off"""
    if not datamart_name:
        return err_resp('datamart_name must be set')

    if not user_workspace_id:
        return err_resp('user_workspace_id must be set')

    if not datamart_params:
        return err_resp('datamart_params must be set')

    # Async task to run augment process
    #
    kick_off_materialize_steps.delay(\
                datamart_name, user_workspace_id,
                datamart_params, **kwargs)

    return ok_resp('augment process started')

@celery_app.task(ignore_result=True)
def kick_off_materialize_steps(datamart_name, user_workspace_id, datamart_params, **kwargs):
    """Run this async"""
    mat_util = MaterializeUtil(datamart_name,
                               user_workspace_id,
                               datamart_params,
                               **kwargs)


def make_augment_call(user_workspace, augment_params, **kwargs):
    """Initiate the augment call
    If successful, an async process is kicked off"""
    if not user_workspace:
        return err_resp('user_workspace must be set')

    if not augment_params:
        return err_resp('augment_params must be set')

    print('augment_params', json.dumps(augment_params, indent=4))
    print('augment keys', augment_params.keys())


    # check if data is valid
    form = DatamartAugmentForm(augment_params)
    if not form.is_valid():
        return err_resp('Invalid augment params: %s' % form.errors)
        #return JsonResponse({"success": False, "message": "invalid input", "errors": form.errors})

    # Async task to run augment process
    #
    kick_off_augment_steps.delay(form.cleaned_data['source'],
                                 user_workspace.id,
                                 augment_params,
                                 **dict(websocket_id=user_workspace.user.username))

    return ok_resp('augment process started')


@celery_app.task(ignore_result=True)
def kick_off_augment_steps(datamart_name, user_workspace_id, augment_params, **kwargs):
    """Run this async"""
    augment_util = AugmentUtil(datamart_name,
                               user_workspace_id,
                               augment_params,
                               **kwargs)
