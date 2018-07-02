from .dev_container2 import *
from distutils.util import strtobool
import os


# -----------------------------------
# use Google Cloud MySQL
# -----------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('EVENTDATA_DB_NAME', 'raven_EventData'),
        'USER': os.environ.get('EVENTDATA_DB_USER'),
        'PASSWORD': os.environ.get('EVENTDATA_DB_PASSWORD'),
        'HOST': os.environ.get('EVENTDATA_DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('EVENTDATA_DB_PORT', 3306),
    }
}
