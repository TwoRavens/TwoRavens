import os
import shutil
import random
import string
#from os.path import abspath, dirname, join

import signal

import sys
from fabric.api import local, task, settings
import django
import subprocess

import re




# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
FAB_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(FAB_BASE_DIR)


if FAB_BASE_DIR == '/srv/webapps/TwoRavens':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                          'tworavensproject.settings.dev_container2')
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

@task
def make_d3m_config_files():
    """Make configs in /ravens_volume and loads them to db"""
    clear_d3m_configs()

    from tworaven_apps.configurations.util_config_maker import TestConfigMaker
    TestConfigMaker.make_deploy_config_files()

@task
def clear_d3m_configs():
    """Delete D3M configs from the database"""
    from tworaven_apps.configurations.models_d3m import D3MConfiguration

    print('-' * 40)
    print('Clear all D3MConfiguration database entries')
    print('-' * 40)

    config_cnt = D3MConfiguration.objects.count()
    if config_cnt == 0:
        print('  -> No DM configs to delete')
    else:
        D3MConfiguration.objects.all().delete()
        print('  -> %d DM config(s) deleted' % config_cnt)

@task
def clear_test_data():
    """Clear d3m configs, d3m output, and preprocess files"""

    # (1) D3M config data in Django
    clear_d3m_configs()

    # (2) Delete Preprocess files
    rook_files_dir = os.path.join(FAB_BASE_DIR, 'rook', 'rook-files')
    print('-' * 40)
    print('Delete preprocess output directory: %s' % rook_files_dir)
    print('-' * 40)
    if os.path.isdir(rook_files_dir):
        shutil.rmtree(rook_files_dir)
        print('  -> Preprocess output directory deleted: %s\n' % rook_files_dir)
    else:
        print('  -> No preprocess files to delete\n')

    # (3) Delete ravens_volume test_output
    d3m_output_dir = os.path.join(FAB_BASE_DIR, 'ravens_volume', 'test_output')
    print('-' * 40)
    print('Delete D3M test output directory: %s' % d3m_output_dir)
    print('-' * 40)
    if os.path.isdir(d3m_output_dir):
        shutil.rmtree(d3m_output_dir)
        print('  -> D3M test output directory deleted: %s' % d3m_output_dir)
    else:
        print('  -> No preprocess D3M test output directory')



@task
def make_d3m_config():
    """Adds D3M configs to database--but DOESN'T create config files"""
    from tworaven_apps.configurations.util_config_maker import TestConfigMaker

    TestConfigMaker.make_configs()

@task
def load_d3m_config_from_env():
    """6/27/2018 update
    - Look for an environment variable named "D3MINPUTDIR"
        - This is the data directory which should include a file named
            "search_config.json"
        - Load "search_config.json" as the D3M config
    - If "D3MINPUTDIR" doesn't exist, display error message and keep running
    """
    from django.core import management
    from tworaven_apps.configurations.models_d3m import \
        (D3M_ENV_INPUT_DIR, D3M_SEARCH_CONFIG_NAME)

    print('-' * 40)
    print('> Attempt to load D3M config based on env variable: "%s"' % \
          D3M_ENV_INPUT_DIR)
    print('-' * 40)

    d3m_data_dir = os.environ.get(D3M_ENV_INPUT_DIR, None)
    if not d3m_data_dir:
        print('Environment variable "%s" not set.' % D3M_ENV_INPUT_DIR)
        return

    d3m_data_dir = d3m_data_dir.strip()
    if not os.path.isdir(d3m_data_dir):
        print('This data directory doesn\'t exist (or is not reachable): %s' % \
              d3m_data_dir)
        return

    config_file = os.path.join(d3m_data_dir, D3M_SEARCH_CONFIG_NAME)
    if not os.path.isfile(config_file):
        print('This config file doesn\'t exist (or is not reachable): %s' % \
              config_file)
        return

    try:
        management.call_command('load_config', d3m_data_dir)
    except management.base.CommandError as err_obj:
        print('> Failed to load D3M config.\n%s' % err_obj)


@task
def load_d3m_config(config_data_dir):
    """Load D3M config file, saving it as the default D3MConfiguration object.  Pass the config file path: fab load_d3m_config:(path to data dir)"""
    from django.core import management

    try:
        management.call_command('load_config', config_data_dir)
        return True
    except management.base.CommandError as err_obj:
        print('> Failed to load D3M config.\n%s' % err_obj)
        return False

@task
def run_featurelabs_choose_config(choice_num=''):
    """Deprecated. Pick a config from /ravens_volume and run FeatureLabs"""
    run_ta2_choose_config(choice_num, ta2_name='FeatureLabs')

#@task
def run_isi_choose_config(choice_num=''):
    """Deprecated. Pick a config from /ravens_volume and run ISI"""
    run_ta2_choose_config(choice_num, ta2_name='ISI')

def run_ta2_choose_config(choice_num='', ta2_name='ISI'):
    """Deprecated. Pick a config from /ravens_volume and run a TA2"""
    from os.path import join, isdir, isfile
    from tworaven_apps.configurations.models_d3m import \
        (D3M_SEARCH_CONFIG_NAME,)

    ravens_dir = '/ravens_volume/test_data'
    ravens_output_dir = '/ravens_volume/test_output'

    # pull config files from ravens volume
    config_choices = [x for x in os.listdir(ravens_dir)
                      if isdir(join(ravens_dir, x)) and \
                         isfile(join(ravens_dir, x, D3M_SEARCH_CONFIG_NAME))]

    # pair each data directory with a number:
    # [(1, 185_baseball), (2, 196_autoMpg), etc]
    #
    choice_pairs = [(idx, x) for idx, x in enumerate(config_choices, 1)]
    if choice_num.isdigit():
        choice_num = int(choice_num)
        if choice_num in [x[0] for x in choice_pairs]:
            data_dir_path = join(ravens_dir, choice_pairs[choice_num-1][1])
            output_dir_path = join(ravens_output_dir, choice_pairs[choice_num-1][1])
            if ta2_name == 'ISI':
                #run_isi_ta2(data_dir_path, output_dir_path)
                return
            elif ta2_name == 'FeatureLabs':
                run_featurelabs_ta2(data_dir_path, output_dir_path)
                return
            else:
                print('\n--> Error: "%s" is not a ta2 choice\n' % ta2_name)
        else:
            print('\n--> Error: "%d" is not a valid choice\n' % choice_num)

    print('-' * 40)
    print('Listing config files in: %s' % ravens_dir)
    print('-' * 40)
    print('\nPlease run the fab command again using a config file number:\n')
    for choice_pair in choice_pairs:
        print('(%d) %s' % (choice_pair[0], choice_pair[1]))

    print('\nExample: fab run_isi_choose_config:1')


@task
def run_featurelabs_ta2(data_dir_path, output_dir_path):
    """inputs: data directory path, output directory path"""
    from tworaven_apps.configurations.models_d3m import \
        (D3M_SEARCH_CONFIG_NAME,)

    if not os.path.isdir(data_dir_path):
        print('ERROR: Data directory not found: %s' % data_dir_path)
        return

    config_file = os.path.join(data_dir_path, D3M_SEARCH_CONFIG_NAME)
    if not os.path.isfile(config_file):
        print('ERROR: config file not found: %s' % config_file)
        return

    if not os.path.isdir(output_dir_path):
        os.makedirs(output_dir_path)
        print('output directory created: %s' % output_dir_path)

    load_d3m_config(data_dir_path)

    print('-' * 40)
    print('Run Feature Labs')
    print('-' * 40)

    docker_cmd = ('docker run --rm -t'
                  ' --name ta2_server'
                  ' -p 45042:45042'
                  ' -e D3MPORT=45042'
                  ' -e D3MTIMEOUT=60'
                  ' -e D3MINPUTDIR={0}'
                  ' -e D3MOUTPUTDIR={1}'
                  ' -e D3MRUN=ta2ta3'
                  ' -v {0}:/input'
                  ' -v {1}:/output'
                  ' -v /ravens_volume:/ravens_volume'
                  ' registry.datadrivendiscovery.org/jkanter/mit-fl-ta2:stable'
                  '').format(data_dir_path, output_dir_path)

    print('Running command: %s' % docker_cmd)

    local(docker_cmd)

def run_isi_ta2(data_dir_path):
    """syntax: `fab run_isi_ta2:[data_dir_path]`.` Also sets django D3M config"""
    if not os.path.isdir(data_dir_path):
        print('data dir path not found: %s' % data_dir_path)

    print('-' * 40)
    print('Django: Loading D3M config...')
    print('-' * 40)
    load_d3m_config(data_dir_path)

    print('-' * 40)
    print('Run ISI')
    print('-' * 40)
    docker_cmd = ('docker run -ti --rm -v /ravens_volume:/ravens_volume -e'
                  ' "CONFIG_JSON_PATH=%s" -p 45042:45042 --name'
                  ' goisi isi_ta2:stable') % (config_json_path)

    print('Running command: %s' % docker_cmd)

    local(docker_cmd)

@task
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


@task
def check_config():
    """If there aren't any db configurations, then load the fixtures"""
    from tworaven_apps.configurations.models import AppConfiguration

    config_cnt = AppConfiguration.objects.count()
    if config_cnt == 0:
        local(('python manage.py loaddata'
               ' tworaven_apps/configurations/fixtures/initial_configs.json'))
    else:
        print('Configs exist in the db: %d' % config_cnt)

@task
def run_ta2_test_server():
    """Run an external server on 45042 to return gRPC TA2TA3 api calls"""

    run_cmd = 'cd tworaven_apps/ta2_interfaces; python test_server.py'
    local(run_cmd)

@task
def get_run_rook_cmd():
    """For running the rook server via the command line"""
    return 'cd rook; Rscript rook_nonstop.R'

@task
def run_rook():
    """Run the rook server via the command line"""
    local(get_run_rook_cmd())

@task
def run_with_rook():
    """In addition to the django dev server and webpack, run rook via the Terminal"""
    run(with_rook=True)

@task
def run_with_ta2():
    """Assumes there's a TA2 running at localhost:45042"""
    run(external_ta2=True)

@task
def run(**kwargs):
    """Run the django dev server and webpack--webpack watches the assets directory and rebuilds when appTwoRavens changes

    with_rook=True - runs rook in "nonstop" mode
    """
    with_rook = kwargs.get('with_rook', False)
    external_ta2 = kwargs.get('external_ta2', False)

    clear_js()  # clear any dev css/js files
    init_db()
    check_config()  # make sure the db has something
    #load_d3m_config_from_env() # default the D3M setting to the env variable
    #ta3_listener_add() # add MessageListener object

    commands = [
        # start webpack
        'npm start',
    ]

    if with_rook:
        commands.append(get_run_rook_cmd())

    proc_list = [subprocess.Popen(command, shell=True, stdin=sys.stdin, stdout=sys.stdout, stderr=sys.stderr) for command in commands]
    try:
        if external_ta2:
            local(("export TA2_STATIC_TEST_MODE=False;"
                   "python manage.py runserver 0.0.0.0:8080"))
        else:
            local("python manage.py runserver 0.0.0.0:8080")
    finally:
        for proc in proc_list:
            os.kill(proc.pid, signal.SIGKILL)

@task
def webpack_prod():
    """Generate the webpack dist files for prod"""

    #cmd_webpack = './node_modules/.bin/webpack --config webpack.config-prod.js --watch'
    cmd_webpack = './node_modules/.bin/webpack --config webpack.prod.config.js'
    local(cmd_webpack)

#@task
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

@task
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

@task
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

@task
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

@task
def collect_static():
    """Run the Django collectstatic command"""
    local('python manage.py collectstatic --noinput')

@task
def init_db():
    """Run django check and migrate"""
    local("python manage.py check")
    local("python manage.py migrate")
    create_django_superuser()
    create_test_user()
    #local("python manage.py loaddata fixtures/users.json")
    #Series(name_abbreviation="Mass.").save()

@task
def run_grpc_tests():
    """Run the gRPC tests, equivalent of 'python manage.py test tworaven_apps.ta2_interfaces'"""
    local('python manage.py test tworaven_apps.ta2_interfaces')


# -----------------------------------
#   Redis and celery tasks
# -----------------------------------
@task
def redis_run():
    """Run the local redis server"""
    redis_cmd = 'redis-server /usr/local/etc/redis.conf'

    with settings(warn_only=True):
        result = local(redis_cmd, capture=True)

        if result.failed:
            print('Redis may already be running...')


@task
def redis_clear():
    """Clear data from the *running* local redis server"""

    redis_cmd = 'redis-cli flushall'    #  /usr/local/etc/redis.conf'
    with settings(warn_only=True):
        result = local(redis_cmd, capture=True)

        if result.failed:
            print('Redis not running, nothing to clear')

@task
def redis_stop():
    """Clear data from the *running* local redis server"""

    redis_cmd = 'pkill -f redis'
    with settings(warn_only=True):
        result = local(redis_cmd, capture=True)

        if result.failed:
            print('Nothing to stop')

@task
def redis_restart():
    """Stop redis (if it's running) and start it again"""
    redis_stop()
    redis_run()

@task
def celery_run(ta2_external=False):
    """Clear redis and Start celery"""
    redis_clear()

    #celery_cmd = ('export TA2_STATIC_TEST_MODE=False;'
    #              'celery -A tworavensproject worker -l info')
    if ta2_external:
        celery_cmd = ('export TA2_STATIC_TEST_MODE=False;'
                      'celery -A tworavensproject worker -l info')
    else:
        celery_cmd = ('celery -A tworavensproject worker -l info')

    local(celery_cmd)


@task
def celery_run_with_ta2():
    """Run celery using an external TA2"""
    celery_run(ta2_external=True)

@task
def celery_stop():
    """Stop the celery processes"""
    celery_cmd = ('pkill -f celery')
    local(celery_cmd)

@task
def celery_restart():
    """Stop celery (if it's running) and start it again"""
    celery_stop()
    celery_run()



@task
def compile_ta3ta2_api():
    """Compile the TA3TA2 grpc .proto files"""
    proto_names = """core pipeline primitive problem value""".split()
    proto_cmds = []
    for pname in proto_names:
        one_cmd = ('python -m grpc_tools.protoc -I . --python_out=.'
                   ' --grpc_python_out=. %s.proto') % pname
        proto_cmds.append(one_cmd)

    proto_dir = os.path.join(FAB_BASE_DIR, 'submodules', 'ta3ta2-api')
    cmd = ('cd %s;'
           '%s') % (proto_dir, ';'.join(proto_cmds))
    local(cmd)

@task
def clear_eventdata_queries():
    """Delete all eventdata queries objects"""
    from django.conf import settings
    # if not settings.ALLOW_FAB_DELETE:
    #     print('For testing! Only if ALLOW_FAB_DELETE settings is True')
    #     return

    from tworaven_apps.eventdata_queries.models import EventDataSavedQuery

    mcnt = EventDataSavedQuery.objects.count()
    print('\n%d Eventdata Objects(s) found' % mcnt)
    if mcnt > 0:
        for meta_obj in EventDataSavedQuery.objects.all().order_by('-id'):
            meta_obj.delete()
        print('Deleted...')
    else:
        print('No EventData objects found.\n')


@task
def clear_archive_queries():
    """Delete all eventdata queries objects"""
    from django.conf import settings
    # if not settings.ALLOW_FAB_DELETE:
    #     print('For testing! Only if ALLOW_FAB_DELETE settings is True')
    #     return

    from tworaven_apps.eventdata_queries.models import ArchiveQueryJob

    mcnt = ArchiveQueryJob.objects.count()
    print('\n%d Eventdata archive Objects(s) found' % mcnt)
    if mcnt > 0:
        for meta_obj in ArchiveQueryJob.objects.all().order_by('-id'):
            meta_obj.delete()
        print('Deleted...')
    else:
        print('No ArchiveData objects found.\n')