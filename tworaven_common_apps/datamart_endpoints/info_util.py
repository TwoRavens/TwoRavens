"""Convenience functions for DatamartInfo"""
import logging
from tworaven_common_apps.datamart_endpoints.models import DatamartInfo
from tworaven_common_apps.datamart_endpoints.static_vals import \
    (DATAMART_ISI_NAME, DATAMART_NYU_NAME)

LOGGER = logging.getLogger(__name__)

_DATAMART_ISI_URL = None
_DATAMART_NYU_URL = None


def get_isi_url():
    """Return the ISI url from the database"""
    global _DATAMART_ISI_URL
    if not _DATAMART_ISI_URL:
        try:
            dm_info = DatamartInfo.active_objects.get(name=DATAMART_ISI_NAME)
        except DatamartInfo.DoesNotExist:
            LOGGER.error('ISI Datamart url not found in database! (info_util.py)')
            return None

        _DATAMART_ISI_URL = dm_info.url

    return _DATAMART_ISI_URL

def get_nyu_url():
    """Return the NYU url from the database"""
    global _DATAMART_NYU_URL
    if not _DATAMART_NYU_URL:
        print('find that url!')
        try:
            dm_info = DatamartInfo.active_objects.get(name=DATAMART_NYU_NAME)
        except DatamartInfo.DoesNotExist:
            LOGGER.error('NYU Datamart url not found in database! (info_util.py)')
            return None

        _DATAMART_NYU_URL = dm_info.url

    print('returning', _DATAMART_NYU_URL)
    return _DATAMART_NYU_URL

def is_datamart_name(dm_name):
    """Is this an active DatamartName?"""
    if DatamartInfo.active_objects.filter(name=dm_name).count() > 0:
        return True

    return False
