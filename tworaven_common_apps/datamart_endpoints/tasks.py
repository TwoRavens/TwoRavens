from tworaven_common_apps.datamart_endpoints.materialize_util import MaterializeUtil
from tworavensproject.celery import celery_app
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)


def make_materialize_call(datamart_name, user_workspace_id, datamart_params, **kwargs):
    """Initiate the materialize call
    If successful, an async process is kicked off"""
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
