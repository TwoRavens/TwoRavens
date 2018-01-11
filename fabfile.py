import os
import random
import string
#from os.path import abspath, dirname, join

import signal

import sys
from fabric.api import local

import django
from django.conf import settings
import subprocess

import re

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
FAB_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(FAB_BASE_DIR)

if FAB_BASE_DIR == '/srv/webapps/TwoRavens':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                          'tworavensproject.settings.dev_container')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                          'tworavensproject.settings.local_settings')
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

def stop():
    """Kill any python/npm processes"""
    try:
        local("killall npm")
    except:
        pass

    try:
        local("killall python")
    except:
        pass

def restart():
    """Kill any python/npm processes and then run"""
    stop()
    run()

def make_d3m_config_files():
    """Only for Docker! Make *deploy* config files. Useful for docker-compose or kubernetes--NOT for local tests.
    The resulting config files will have paths specified from "/ravens_volume"
    """
    from tworaven_apps.configurations.util_config_maker import TestConfigMaker

    TestConfigMaker.make_deploy_config_files()


def make_d3m_config():
    """Make a D3M config based on local files in the /ravens_volume directory"""
    from tworaven_apps.configurations.util_config_maker import TestConfigMaker

    TestConfigMaker.make_configs()

'''
def load_d3m_config_from_env():
    """DEPRECATED! Load docker config file from path specified in the environment variable D3M_CONFIG_FILEPATH. The information in this file becomes the default D3MConfiguration object. If D3M_CONFIG_FILEPATH doesn't exist, display error message and keep running."""
    from django.core import management
    from tworaven_apps.configurations.models_d3m import CONFIG_JSON_PATH

    print('> Attempt to load D3M config from env variable: %s' % CONFIG_JSON_PATH)
    config_file = os.environ.get(CONFIG_JSON_PATH, None)
    if not config_file:
        print('Environment variable %s not set.' % CONFIG_JSON_PATH)
        return

    config_file = config_file.strip()
    if not os.path.isfile(config_file):
        print('This config file doesn\'t exist (or is not reachable): %s' % config_file)
        return

    try:
        management.call_command('load_config', config_file)
    except management.base.CommandError as err_obj:
        print('> Failed to load D3M config.\n%s' % err_obj)
'''

def load_d3m_config(config_file):
    """Load D3M config file, saving it as the default D3MConfiguration object.  Pass the config file path: fab load_d3m_config:(path to config file)"""
    from django.core import management

    try:
        management.call_command('load_config', config_file)
        return True
    except management.base.CommandError as err_obj:
        print('> Failed to load D3M config.\n%s' % err_obj)
        return False




def load_docker_ui_config():
    """Load config pk=3, name 'Docker Default configuration'"""
    check_config()

    from tworaven_apps.configurations.models import AppConfiguration

    le_config = AppConfiguration.objects.get(pk=3)
    le_config.is_active = True
    le_config.save()

    print('new config activated: ')
    for k, val in le_config.__dict__.items():
        if not k.startswith('_'):
            print('     > %s: %s' % (k, val))



def check_config():
    """If there aren't any db configurations, then load the fixtures"""
    from tworaven_apps.configurations.models import AppConfiguration

    config_cnt = AppConfiguration.objects.count()
    if config_cnt == 0:
        local(('python manage.py loaddata'
               ' tworaven_apps/configurations/fixtures/initial_configs.json'))
    else:
        print('Configs exist in the db: %d' % config_cnt)

def run_ta2_test_server():
    """Run an external server on 50051 to return gRPC TA2TA3 api calls"""

    run_cmd = 'cd tworaven_apps/ta2_interfaces; python test_server.py'
    local(run_cmd)

def get_run_rook_cmd():
    """For running the rook server via the command line"""
    return 'cd rook; Rscript rook_nonstop.R'

def run_rook():
    """Run the rook server via the command line"""
    local(get_run_rook_cmd())

def run_with_rook():
    """In addition to the django dev server and webpack, run rook via the Terminal"""
    run(with_rook=True)

def run(with_rook=False):
    """Run the django dev server and webpack--webpack watches the assets directory and rebuilds when appTwoRavens changes

    with_rook=True - runs rook in "nonstop" mode
    """
    clear_js()  # clear any dev css/js files
    init_db()
    check_config()  # make sure the db has something
    load_d3m_config_from_env() # default the D3M setting to the env variable
    ta3_listener_add() # add MessageListener object

    commands = [
        # start webpack
        'npm start',
    ]

    if with_rook:
        commands.append(get_run_rook_cmd())

    proc_list = [subprocess.Popen(command, shell=True, stdin=sys.stdin, stdout=sys.stdout, stderr=sys.stderr) for command in commands]
    try:
        local("python manage.py runserver 0.0.0.0:8080")
    finally:
        for proc in proc_list:
            os.kill(proc.pid, signal.SIGKILL)

def webpack_prod():
    """Generate the webpack dist files for prod"""

    #cmd_webpack = './node_modules/.bin/webpack --config webpack.config-prod.js --watch'
    cmd_webpack = './node_modules/.bin/webpack --config webpack.prod.config.js'
    local(cmd_webpack)

def clear_js():
    """Delete old webpack dev. build files"""
    print(clear_js.__doc__)

    # webpack build directory
    webpack_build_dir = os.path.join(FAB_BASE_DIR, 'assets', 'build')

    # find files
    pat1 = r'^tworavens_(app|styles)\-(\w|-){20,50}\.(js|css)$'

    build_file_names = [x for x in os.listdir(webpack_build_dir)
                        if re.match(pat1, x) is not None]

    #if (x.startswith('log_') and x.endswith('.txt'))\
    #                      or (x.startswith('output') and x.endswith('.png'))]
    if not build_file_names:
        print('No files found')
        return

    print('Deleting %s file(s)' % len(build_file_names))
    print('-' * 40)
    for fname in [os.path.join(webpack_build_dir, x) for x in build_file_names]:
        print('removing... %s' % fname)
        os.remove(fname)
    print('-' * 40)
    print('Deleted %s file(s)' % len(build_file_names))


def clear_logs():
    """Delete log files, image files, and preprocess files from rook"""
    print(clear_logs.__doc__)

    # rook directory
    rook_log_dir = os.path.join(FAB_BASE_DIR, 'rook')

    # find files
    pat1 = r'^log_(\w|-){25,50}\.txt$'
    pat2 = r'^output(\w|-){2,10}\.png$'

    log_files_names = [x for x in os.listdir(rook_log_dir)
                       if re.match(pat1, x) is not None or
                       re.match(pat2, x) is not None]

    if log_files_names:
        print('Deleting %s log file(s)' % len(log_files_names))
        print('-' * 40)
        for fname in [os.path.join(rook_log_dir, x) for x in log_files_names]:
            print('removing... %s' % fname)
            os.remove(fname)
        print('-' * 40)
        print('Deleted %s log file(s)' % len(log_files_names))

    # data directory
    rook_data_dir = os.path.join(FAB_BASE_DIR, 'data')

    pat3 = r'^preprocessSubset_(\w|-){15,50}\.txt$'
    data_file_names = [x for x in os.listdir(rook_data_dir)
                       if re.match(pat3, x) is not None]

    if data_file_names:
        print('Deleting %s data file(s)' % len(data_file_names))
        print('-' * 40)
        for fname in [os.path.join(rook_data_dir, x) for x in data_file_names]:
            print('removing... %s' % fname)
            os.remove(fname)
        print('-' * 40)
        print('Deleted %s log file(s)' % len(data_file_names))


def create_test_user():
    """Create regular user with creds: test_user/test_user.  No admin access"""
    from tworaven_apps.raven_auth.models import User

    test_username = 'test_user'

    if User.objects.filter(username=test_username).count() > 0:
        print('A "%s" test user already exists' % test_username)
        return

    test_pw = test_username

    new_user = User(username=test_username,
                    first_name='Test',
                    last_name='User',
                    is_staff=False,
                    is_active=True,
                    is_superuser=False)

    new_user.set_password(test_pw)
    new_user.save()

    print('test user created: "%s"' % test_username)
    print('password: "%s"' % test_pw)

def create_django_superuser():
    """(Test only) Create superuser with username: dev_admin. Password is printed to the console."""
    from tworaven_apps.raven_auth.models import User
    #from django.contrib.auth.models import User

    dev_admin_username = 'dev_admin'

    #User.objects.filter(username=dev_admin_username).delete()
    if User.objects.filter(username=dev_admin_username).count() > 0:
        print('A "%s" superuser already exists' % dev_admin_username)
        return

    admin_pw = 'admin'
    #''.join(random.choice(string.ascii_lowercase + string.digits)
    #                   for _ in range(7))

    new_user = User(username=dev_admin_username,
                    first_name='Dev',
                    last_name='Administrator',
                    is_staff=True,
                    is_active=True,
                    is_superuser=True)
    new_user.set_password(admin_pw)
    new_user.save()

    print('superuser created: "%s"' % dev_admin_username)
    print('password: "%s"' % admin_pw)


def collect_static():
    """Run the Django collectstatic command"""
    local('python manage.py collectstatic --noinput')

def init_db():
    """Run django check and migrate"""
    local("python manage.py check")
    local("python manage.py migrate")
    create_django_superuser()
    create_test_user()
    #local("python manage.py loaddata fixtures/users.json")
    #Series(name_abbreviation="Mass.").save()

def run_grpc_tests():
    """Run the gRPC tests, equivalent of 'python manage.py test tworaven_apps.ta2_interfaces'"""
    local('python manage.py test tworaven_apps.ta2_interfaces')


def ta3_listener_add():
    """Add local web server address for ta3_search messages"""
    from tworaven_apps.ta3_search.message_util import MessageUtil

    web_url = 'http://0.0.0.0:8001'
    success, mlistener = MessageUtil.add_listener(web_url, 'ta3 listener')

    user_msg = ('listener registered: %s at %s') % \
                (mlistener, mlistener.web_url)

    print(user_msg)

def ta3_listener_run():
    """Start a flask server that receives messages from the UI
    Part of scaffolding for the D3M eval"""
    ta3_dir = os.path.join(FAB_BASE_DIR,
                          'tworaven_apps',
                          'ta3_search')

    flask_cmd = ('cd %s;'
                 'FLASK_APP=ta3_listener.py flask run -p8001') % \
                 (ta3_dir,)

    local(flask_cmd)
