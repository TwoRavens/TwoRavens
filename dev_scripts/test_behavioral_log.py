import os, sys
import json
from os.path import abspath, dirname, join

sys.path.append(dirname(abspath(__file__)))
sys.path.append(dirname(dirname(abspath(__file__))))

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
    import BehavioralLogFormatter as LogFormatter
from tworaven_apps.behavioral_logs import static_vals as bl_static


def test_write():
    """Test some basic functions"""
    entry = BehavioralLogEntry.objects.all()
    csv_lines = [LogFormatter.get_header_line()]
    for item in entry:
        csv_lines.append(LogFormatter.get_csv_line(item))

    print(''.join(csv_lines))

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
    # test_write()
    test_form()
