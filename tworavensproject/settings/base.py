"""
Django settings for tworavensproject project.

Generated by 'django-admin startproject' using Django 1.11.4.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.11/ref/settings/
"""

import os
from os.path import abspath, dirname, join
from distutils.util import strtobool


# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = dirname(dirname(dirname(abspath(__file__))))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.11/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = '&1p0bkm1!)x49#g^fcqlwa8ds_p_r$x@c*+vrpveaq=dhr_rzu'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

SITE_ID = 1

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.sites',
    # See: http://whitenoise.evans.io/en/stable/django.html#using-whitenoise-in-development
    #'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',

    'tworaven_apps.configurations',
    'tworaven_apps.ta2_interfaces',
    'tworaven_apps.content_pages',
    'tworaven_apps.rook_services',
    'tworaven_apps.api_docs',
    'tworaven_apps.call_captures',

    #'tworaven_apps.workspaces',

    # webpack!
    'webpack_loader',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',

    # whitenoise: http://whitenoise.evans.io/en/stable/django.html#enable-whitenoise
    #'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'tworavensproject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [join(BASE_DIR, 'templates'),],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'tworavensproject.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.11/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/1.11/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/1.11/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Store the CSRF in a session: https://docs.djangoproject.com/en/1.11/ref/settings/#std:setting-CSRF_USE_SESSIONS
#CSRF_USE_SESSIONS = True
CSRF_COOKIE_NAME = 'CSRF_2R'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.11/howto/static-files/

STATIC_URL = '/static/'

STATICFILES_DIRS = [join(BASE_DIR, 'assets')]

# Simplified static file serving.
# https://warehouse.python.org/project/whitenoise/
#STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

RECORD_R_SERVICE_ROUTING = False # log R service requests/response JSON to db
RECORD_D3M_SERVICE_ROUTING = False # log D3M service requests


WEBPACK_LOADER = {
    'DEFAULT': {
        'CACHE': not DEBUG,
        'BUNDLE_DIR_NAME': 'build/', # must end with slash
        'STATS_FILE': join(BASE_DIR, 'webpack-stats.json'),
        'POLL_INTERVAL': 0.1,
        'TIMEOUT': None,
        'IGNORE': ['.+\.hot-update.js', '.+\.map']
    }
}

SERVER_SCHEME = 'http'  # or https

## D3M - TA2 settings
#
# Test work...
TA2_STATIC_TEST_MODE = strtobool(os.environ.get('TA2_STATIC_TEST_MODE', 'True'))   # True: canned responses
TA2_TEST_SERVER_URL = os.environ.get('TA2_TEST_SERVER_URL', 'localhost:50051')
TA2_GPRC_USER_AGENT = os.environ.get('TA2_GPRC_USER_AGENT', 'tworavens')


# D3M - gRPC file uris
MAX_EMBEDDABLE_FILE_SIZE = .5 * 500000
