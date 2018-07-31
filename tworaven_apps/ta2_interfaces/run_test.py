import os, sys
import csv
from os.path import abspath, dirname, join

code_dir1 = dirname(dirname(dirname(abspath(__file__))))
sys.path.extend([code_dir1,])

# Force connection to an external TA2
#
os.environ.setdefault('TA2_STATIC_TEST_MODE',
                      'False')

os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'tworavensproject.settings.local_settings')

import django
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

from tworaven_apps.ta2_interfaces.util_pipeline_check import PipelineInfoUtil


def pipeline_test():
    """test"""
    putil = PipelineInfoUtil()
    putil.show_results()

if __name__ == '__main__':
    pipeline_test()

"""
export EVENTDATA_MONGO_PASSWORD=the-pw
"""
