import os, sys
import json
from os.path import abspath, dirname, isdir, join

CURRENT_DIR = dirname(abspath(__file__))
sys.path.append(CURRENT_DIR)
sys.path.append(dirname(CURRENT_DIR))

os.environ.setdefault('TA2_STATIC_TEST_MODE',
                      'False')
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'tworavensproject.settings.local_settings')

import django
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

from tworaven_apps.behavioral_logs.models import BehavioralLogEntry
from tworaven_apps.behavioral_logs.forms import BehavioralLogEntryForm
from tworaven_apps.behavioral_logs.log_formatter \
    import BehavioralLogFormatter
from tworaven_apps.behavioral_logs import static_vals as bl_static


def test_write():
    """Test some basic functions"""
    entries = BehavioralLogEntry.objects.all()
    blf = BehavioralLogFormatter(log_entries=entries)
    if blf.has_error():
        print('error: ', blf.get_error_message())
    else:
        csv_output = blf.get_csv_content()

    print(csv_output)
    output_dir = join(CURRENT_DIR, 'output')
    if not isdir(output_dir):
        os.makedirs(output_dir)

    fname = join(output_dir, 'test_output.csv')
    open(fname, 'w').write(csv_output)
    print('file written: ', fname)

def test_form():
    """Test form input"""
    params = dict(type=bl_static.ENTRY_TYPE_TA23API,
                  activity_l1=bl_static.L1_DATA_PREPARATION,
                  activity_l2='lookin_good',
                  path='ze-path')

    f = BehavioralLogEntryForm(params)

    if f.is_valid():
        print('ok!')
        print(f.cleaned_data)
    else:
        #print(f.errors)
        print(dict(f.errors))
        #print(f.errors.as_json())


if __name__ == '__main__':
    test_write()
    # test_form()
