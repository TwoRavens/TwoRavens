"""Helper class for Datamart"""
from tworaven_apps.datamart_endpoints.static_vals import \
    (DATAMART_NAMES, DATAMART_ISI_NAME, DATAMART_NYU_NAME)
from tworaven_apps.datamart_endpoints.datamart_util_isi import \
    (DatamartJobUtilISI,)
from tworaven_apps.datamart_endpoints.datamart_util_nyu import \
    (DatamartJobUtilNYU,)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)


DATAMART_JOB_LOOKUP = {DATAMART_ISI_NAME: DatamartJobUtilISI,
                       DATAMART_NYU_NAME: DatamartJobUtilNYU}


def get_datamart_job_util(dm_name):
    """Return the appropriate job util"""
    if not dm_name in DATAMART_JOB_LOOKUP:
        return err_resp((f'"{ dm_name }" unknown.  Appropriate values'
                         f' are: {DATAMART_NAMES}'))

    return ok_resp(DATAMART_JOB_LOOKUP[dm_name])
