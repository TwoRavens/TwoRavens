import os, sys
import csv
from os.path import abspath, dirname, join

code_dir1 = dirname(dirname(dirname(abspath(__file__))))
sys.path.extend([code_dir1,])

os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'tworavensproject.settings.local_settings')

import django
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil


def check_mongo():
    """test"""
    # ['cline_phoenix_nyt', 'icews', 'cline_phoenix_swb', 'acled_asia', 'cline_speed', 'acled_africa', 'acled_middle_east', 'cline_phoenix_fbis']
    mr = MongoRetrieveUtil('icews', '*')
    if mr.has_error():
        print(mr.error_message)

if __name__ == '__main__':
    check_mongo()

"""
export EVENTDATA_MONGO_PASSWORD=the-pw
"""
