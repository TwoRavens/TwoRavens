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

def make_d3m_config():
    """Make a D3M config based on local files in the /data directory"""
    from tworaven_apps.configurations.util_config_maker import TestConfigMaker

    TestConfigMaker.make_configs()

def load_d3m_config(config_file):
    """Load D3M config file, saving it as D3MConfiguration object.  Pass the config file path: fab load_d3m_config:(path to config file)"""
    from django.core import management

    try:
        management.call_command('load_config', config_file)
    except management.base.CommandError as err_obj:
        print('> Failed to load D3M config.\n%s' % err_obj)

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

    commands = [
        # start webpack
        #'./node_modules/.bin/webpack --watch'
        'npm start',
        #'python manage.py runserver 8080'
        #'celery -A firmament worker --loglevel=info -B'
    ]

    if with_rook:
        rook_run_cmd = 'cd rook; Rscript rook_nonstop.R'
        commands.append(rook_run_cmd)

    proc_list = [subprocess.Popen(command, shell=True, stdin=sys.stdin, stdout=sys.stdout, stderr=sys.stderr) for command in commands]
    try:
        local("python manage.py runserver 127.0.0.1:8080")
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



def create_django_superuser():
    """(Test only) Create superuser with username: dev_admin. Password is printed to the console."""
    from django.contrib.auth.models import User

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



def init_db():
    """Run django check and migrate"""
    local("python manage.py check")
    local("python manage.py migrate")
    create_django_superuser()
    #local("python manage.py loaddata fixtures/users.json")
    #Series(name_abbreviation="Mass.").save()

def test_front_matter():
    pass
    #from firmament.models import Volume
    #Volume.objects.first().generate_front_matter()

def ubuntu_help():
    """Set up directories for ubuntu 16.04 (in progress)"""
    from setup.ubuntu_setup import TwoRavensSetup
    trs = TwoRavensSetup()
