"""Convenience functions for accessing DatamartInfo objects in database"""
import logging
import os
from tworaven_apps.datamart_endpoints.models import DatamartInfo
from tworaven_apps.datamart_endpoints.static_vals import \
    (DATAMART_ISI_NAME, DATAMART_NYU_NAME)
from tworaven_apps.datamart_endpoints import static_vals as dm_static
from tworaven_apps.utils.basic_response import ok_resp, err_resp

LOGGER = logging.getLogger(__name__)

_DATAMART_ISI_URL = None
_DATAMART_NYU_URL = None

MIN_DATAMART_URL_LENGTH = 5

def update_isi_url(updated_url):
    """Update the ISI url"""
    if not updated_url or len(updated_url) < MIN_DATAMART_URL_LENGTH:
        return err_resp((f'The updated_url must be at'
                         f'least {MIN_DATAMART_URL_LENGTH} chars long'))

    global _DATAMART_ISI_URL
    _DATAMART_ISI_URL = None

    try:
        dm_info = DatamartInfo.active_objects.get(name=dm_static.DATAMART_ISI_NAME)
    except DatamartInfo.DoesNotExist:
        user_msg = 'ISI Datamart url not found in database! (info_util.py)'
        return err_resp(user_msg)

    dm_info.url = updated_url
    dm_info.save()

    LOGGER.info('Updated ISI url: ', dm_info.url)

    return ok_resp(updated_url)

def get_isi_url():
    """Return the ISI url from the database"""
    global _DATAMART_ISI_URL
    if not _DATAMART_ISI_URL:
        try:
            dm_info = DatamartInfo.active_objects.get(name=dm_static.DATAMART_ISI_NAME)
        except DatamartInfo.DoesNotExist:
            LOGGER.error('ISI Datamart url not found in database! (info_util.py)')
            return None

        _DATAMART_ISI_URL = dm_info.url

    return _DATAMART_ISI_URL


def update_nyu_url(updated_url):
    """Update the NYU url"""
    if not updated_url or len(updated_url) < MIN_DATAMART_URL_LENGTH:
        return err_resp((f'The updated_url must be at'
                         f'least {MIN_DATAMART_URL_LENGTH} chars long'))

    global _DATAMART_NYU_URL
    _DATAMART_NYU_URL = None

    try:
        dm_info = DatamartInfo.active_objects.get(name=dm_static.DATAMART_NYU_NAME)
    except DatamartInfo.DoesNotExist:
        user_msg = 'NYU Datamart url not found in database! (info_util.py)'
        return err_resp(user_msg)

    dm_info.url = updated_url
    dm_info.save()

    LOGGER.info('Updated NYU url: ', dm_info.url)

    return ok_resp(updated_url)

def get_nyu_url():
    """Return the NYU url from the database"""
    global _DATAMART_NYU_URL
    if not _DATAMART_NYU_URL:
        print('find that url!')
        try:
            dm_info = DatamartInfo.active_objects.get(name=dm_static.DATAMART_NYU_NAME)
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


def load_from_env_variables():
    """July 2019 Integration. Update the ISI and NYU Datamart
    urls using environment variables"""
    isi_url = os.environ.get(dm_static.DATAMART_ENV_ISI_URL)
    if isi_url:
        update_isi_url(isi_url)

    nyu_url = os.environ.get(dm_static.DATAMART_ENV_NYU_URL)
    if nyu_url:
        update_nyu_url(nyu_url)
