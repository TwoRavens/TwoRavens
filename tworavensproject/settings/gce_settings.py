#
# For deployment on 2ravens.org
#
from .dev_container2 import *

# -----------------------------------
# use Google Cloud MySQL
# -----------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'd3m_gce_ravendb'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', 3306),
    }
}

SWAGGER_HOST = '2ravens.org'
