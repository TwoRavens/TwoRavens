"""Helper class for Datamart"""
from tworaven_apps.datamart_endpoints import static_vals as dm_static
from tworaven_apps.datamart_endpoints.datamart_util_isi import \
    (DatamartJobUtilISI,)
from tworaven_apps.datamart_endpoints.datamart_util_nyu import \
    (DatamartJobUtilNYU,)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)


DATAMART_JOB_LOOKUP = {dm_static.DATAMART_ISI_NAME: DatamartJobUtilISI,
                       dm_static.DATAMART_NYU_NAME: DatamartJobUtilNYU}


def get_datamart_job_util(dm_name):
    """Return the appropriate job util"""
    if not dm_name in DATAMART_JOB_LOOKUP:
        return err_resp((f'"{ dm_name }" unknown.  Appropriate values'
                         f' are: {dm_static.DATAMART_NAMES}'))

    return ok_resp(DATAMART_JOB_LOOKUP[dm_name])
