"""
Usage at top of other scripts

from load_django_settings import load_local_settings
load_local_settings()
"""
import os, sys
import json
from os.path import abspath, dirname, isdir, join


def load_local_settings():

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

if __name__ == '__main__':
    load_local_settings()
