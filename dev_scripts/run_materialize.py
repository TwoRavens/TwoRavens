import os, sys
import json
from os.path import abspath, dirname, join

sys.path.append(dirname(abspath(__file__)))
sys.path.append(dirname(dirname(abspath(__file__))))
#FAB_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.environ.setdefault('TA2_STATIC_TEST_MODE',
                      'False')
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'tworavensproject.settings.local_settings')

import django
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

from tworaven_common_apps.datamart_endpoints.static_vals import \
    (DATAMART_ISI_NAME,)
from tworaven_common_apps.datamart_endpoints.materialize_util import \
    (MaterializeUtil,)
from tworaven_common_apps.datamart_endpoints.tasks import make_materialize_call

def test_materialize():
    """run materialize"""
    user_workspace_id = 89

    sr_fname = join('.', 'input', 'isi_materialize_req_01.json')

    datamart_params = json.loads(open(sr_fname, 'r').read())

    mu = MaterializeUtil(DATAMART_ISI_NAME,
                         user_workspace_id,
                         datamart_params)

    if mu.has_error():
        print('error: ', mu.get_error_message())
    else:
        for key, val in mu.materialize_result.items():
            if not val:
                print(f'\n{key}: (none)')
            else:
                print('\n%s: %s' % (key, str(val)[:150]))

        #print('materialize_result', mu.materialize_result)
    #    print('success: ', mu.materialize_result)
    #mu.show_info()

def test_celery_materialize():
    """run materialize"""
    user_workspace_id = 91

    sr_fname = join('.', 'input', 'isi_materialize_req_01.json')

    datamart_params = json.loads(open(sr_fname, 'r').read())

    mu_info = make_materialize_call(\
                     DATAMART_ISI_NAME,
                     user_workspace_id,
                     datamart_params,
                     **dict(websocket_id='dev_admin'))

    if not mu_info.success:
        print('error: ', mu_info.err_msg)
    else:
        print('mu_info msg', mu_info.result_obj)


if __name__ == '__main__':
    test_celery_materialize()
