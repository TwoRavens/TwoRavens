from .dev_container2 import *
from distutils.util import strtobool
import os

DEBUG = False

STATIC_ROOT = join('/ravens_volume', 'staticfiles')
if not os.path.isdir(STATIC_ROOT):
    os.makedirs(STATIC_ROOT)

# -----------------------------------
# use Google Cloud MySQL
# -----------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'gce_raven_eventdata'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', 3306),
    }
}
