import os
import shutil
import random
import string

import signal

import sys
from fabric.api import local, task, settings
import django
import subprocess
import re
import os

# ----------------------------------------------------
# Add this directory to the python system path
# ----------------------------------------------------
FAB_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(FAB_BASE_DIR)

# ----------------------------------------------------
# Set the DJANGO_SETTINGS_MODULE, if it's not already
# ----------------------------------------------------
KEY_DJANGO_SETTINGS_MODULE = 'DJANGO_SETTINGS_MODULE'
if not KEY_DJANGO_SETTINGS_MODULE in os.environ:
    if FAB_BASE_DIR == '/srv/webapps/TwoRavens':
        os.environ.setdefault(KEY_DJANGO_SETTINGS_MODULE,
                              'tworavensproject.settings.dev_container2')
    else:
        os.environ.setdefault(KEY_DJANGO_SETTINGS_MODULE,
                              'tworavensproject.settings.local_settings')

# ----------------------------------------------------
# Django setup
# ----------------------------------------------------
try:
    django.setup()
except Exception as e:
    print("WARNING: Can't configure Django. %s" % e)

# ----------------------------------------------------
# tasks, etc
# ----------------------------------------------------
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
def make_d3m_configs_from_files():
    """Make configs from /ravens_volume and loads them to db"""
    clear_d3m_configs()

    from tworaven_apps.configurations.env_config_loader import EnvConfigLoader
    loader = EnvConfigLoader.make_d3m_test_configs_env_based('/ravens_volume/test_data')

@task
def make_d3m_configs_from_files_multiuser_test():
    """11/2019 Make configs from /ravens_volume and loads them to db
    Also make the input/output directories 1-level higher than usual
    """
    clear_d3m_configs()

    from tworaven_apps.configurations.env_config_loader import EnvConfigLoader

    params = dict(is_multi_dataset_demo=True)
    loader = EnvConfigLoader.make_d3m_test_configs_env_based(\
                    '/ravens_volume/test_data',
                    **params)

@task
def make_d3m_configs_from_files_multiuser_test_limited():
    """1/2020 Make configs from /ravens_volume and loads them to db
    Also make the input/output directories 1-level higher than usual
    """
    clear_d3m_configs()

    from tworaven_apps.configurations.env_config_loader import EnvConfigLoader
    from tworaven_apps.configurations import static_vals as cstatic

    params = dict(is_multi_dataset_demo=True)


    selected_datatsets = [\
      #'20_Ethiopia_Admin_Level_2_sub',
        'TR102_Northern_Ireland',
        'TR20_State_Conflict',
        'TR50_PRIO_GRID',
        'TR60_Ethiopia_Small_2017-2018',
        'TR61_Ethiopia_Large_2017-2018',
        'TR81_Ethiopia_phemyear',
        #'TR82_Ethiopia_phemlarge',
        'TR83_Ethiopia_gdl_sub',
        #'TR84_Ethiopia_zone_mon',
        'TR85_Ethiopia_zone_mon_sub',
        #'TR86_Ethiopia_zone_mon_sub_con',
        #'TR87_Ethiopia_zone_mon_con',
        'TR88_Ethiopia_phemclean',
        'TR89_Ethiopia_zone_mon_sub_fert',
        #
        'TR90_Ethiopia_Oromia_1997-2018_April30',
        'TR91_Acled_et_2011_2020',
        '185_baseball',
        '196_autoMpg',
        # 'LL1_PHEM_weeklyData_malnutrition',
        'DA_poverty_estimation']

    # -------------------------------
    # Check if selected datasets are
    # set by an env variable
    # -------------------------------
    env_datasets = os.environ.get(cstatic.TEST_DATASETS, None)
    if env_datasets:
        env_datasets = [x.strip()
                        for x in env_datasets.split()
                        if len(x.strip()) > 0]
        if env_datasets:
            selected_datatsets = env_datasets

    # Names of directories of datasets that should be available to users
    #   - This can also be updated in the admin
    #
    params[cstatic.SELECTED_NAME_LIST] = selected_datatsets

    loader = EnvConfigLoader.make_d3m_test_configs_env_based(\
                    '/ravens_volume/test_data',
                    **params)

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

    # (2) Delete ravens_volume test_output
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
def load_d3m_config_from_env():
    """1/27/2019 update. Load from env variables.
    - Look for an environment variable named "D3MINPUTDIR"
    - If "D3MINPUTDIR" doesn't exist, display error message and keep running
    """
    from django.conf import settings
    from django.core import management
    from tworaven_apps.configurations.models_d3m import \
        (D3M_SEARCH_CONFIG_NAME,)

    print('-' * 40)
    print('> Attempt to load D3M config data from environment')
    print('-' * 40)

    if not settings.D3MINPUTDIR:
        print('Environment variable "D3MINPUTDIR" not set.')
        return

    d3m_data_dir = settings.D3MINPUTDIR.strip()
    if not os.path.isdir(d3m_data_dir):
        print('This data directory doesn\'t exist (or is not reachable): %s' % \
              d3m_data_dir)
        return

    print('(1) Attempt to load 2018 config "%s"' % D3M_SEARCH_CONFIG_NAME)
    config_file = os.path.join(d3m_data_dir, D3M_SEARCH_CONFIG_NAME)
    if os.path.isfile(config_file):

        try:
            management.call_command('load_config', d3m_data_dir)
        except management.base.CommandError as err_obj:
            print('> Failed to load D3M config.\n%s' % err_obj)
        return
    else:
        print('This config file doesn\'t exist (or is not reachable): %s' % \
              config_file)

    print('(2) Attempt to load 2019 config from environment variables')

    from tworaven_apps.configurations.env_config_loader import EnvConfigLoader
    loader = EnvConfigLoader.run_loader_from_env()
    if loader.has_error():
        print('Failed: %s' % loader.get_error_message())
    else:
        d3m_config = loader.get_d3m_config()
        print('Success! New config [id:%s] %s' % \
                (d3m_config.id, d3m_config.name))


@task
def load_d3m_config(config_data_dir):
    """1/28/19 Create a new config. Pass the input directory path: fab load_d3m_config:(path to data dir)"""

    from django.core import management

    try:
        management.call_command('load_config_by_data_dir', config_data_dir)
        return True
    except management.base.CommandError as err_obj:
        print('> Failed to load D3M config.\n%s' % err_obj)
        return False


@task
def stop_ta2_server():
    """Stop any running docker container with the name "ta2_server" """
    print('-' * 40)
    print('Stop any running TA2 servers -- docker container named "ta2_server"')
    print('(may take a few seconds)')
    print('-' * 40)
    with settings(warn_only=True):
        result = local('docker stop ta2_server', capture=True)
        if result.failed:
            print('No docker container running with the name "ta2_server"\n')

        result = local('docker rm ta2_server', capture=True)
        if result.failed:
            print('No docker container named "ta2_server"\n')

@task
def run_ta2_stanford_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run the Standford TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
            (TA2Helper, TA2_STANFORD)

    resp = TA2Helper.run_ta2_with_dataset(\
                TA2_STANFORD,
                choice_num,
                run_ta2_stanford_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('-' * 40)
        print('Run TA2 with command:')
        print('-' * 40)
        print(docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)

@task
def run_ta2_featurelabs_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run the FeatureLabs TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
            (TA2Helper, TA2_FeatureLabs)

    resp = TA2Helper.run_ta2_with_dataset(\
                TA2_FeatureLabs,
                choice_num,
                run_ta2_featurelabs_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('-' * 40)
        print('Run TA2 with command:')
        print('-' * 40)
        print(docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)
    #run_ta2_choose_config(choice_num, ta2_name=TA2_FeatureLabs)

# Brown TA2 is no longer being developed. 2/2020
@task
def run_ta2_brown_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run Brown's TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
            (TA2Helper, TA2_Brown)

    resp = TA2Helper.run_ta2_with_dataset(\
                TA2_Brown,
                choice_num,
                run_ta2_brown_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('Running command: %s' % docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)


@task
def run_ta2_berkeley_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run Berkeley's TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
            (TA2Helper, TA2_BERKELEY)

    resp = TA2Helper.run_ta2_with_dataset(\
                TA2_BERKELEY,
                choice_num,
                run_ta2_berkeley_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('Running command: %s' % docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)


@task
def run_ta2_isi_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run ISI's TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
            (TA2Helper, TA2_ISI)

    resp = TA2Helper.run_ta2_with_dataset(\
                TA2_ISI,
                choice_num,
                run_ta2_isi_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('Running command: %s' % docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)


@task
def run_ta2_tamu_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run TAMU's TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
        (TA2Helper, TA2_TAMU)

    resp = TA2Helper.run_ta2_with_dataset( \
        TA2_TAMU,
        choice_num,
        run_ta2_tamu_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('Running command: %s' % docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)


@task
def run_ta2_cmu_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run CMU's TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
        (TA2Helper, TA2_CMU)

    resp = TA2Helper.run_ta2_with_dataset( \
        TA2_CMU,
        choice_num,
        run_ta2_cmu_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('Running command: %s' % docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)

@task
def run_ta2_nyu_choose_config(choice_num=''):
    """Pick a config from /ravens_volume and run the Standford TA2"""
    from tworaven_apps.ta2_interfaces.ta2_dev_util import \
        (TA2Helper, TA2_NYU)

    resp = TA2Helper.run_ta2_with_dataset( \
        TA2_NYU,
        choice_num,
        run_ta2_stanford_choose_config.__name__)

    if resp.success:
        stop_ta2_server()

        docker_cmd = resp.result_obj
        print('-' * 40)
        print('Run TA2 with command:')
        print('-' * 40)
        print(docker_cmd)
        local(docker_cmd)
    elif resp.err_msg:
        print(resp.err_msg)

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
def check_datamarts():
    """If there aren't any db configurations, then load the fixtures
    - Update the configurations from available env variables
    """
    from tworaven_apps.datamart_endpoints.models import DatamartInfo
    from tworaven_apps.datamart_endpoints import datamart_info_util
    # Are any DatamartInfo objects in the database?
    #
    config_cnt = DatamartInfo.objects.count()

    # No.  Then load the default fixtures
    #
    if config_cnt == 0:
        local(('python manage.py loaddata'
               ' tworaven_apps/datamart_endpoints/'
               'fixtures/initial_datamarts.json'))
    else:
        print('Configs exist in the db: %d' % config_cnt)

    # If appropriate, override db settings with
    # any environment variables
    #
    datamart_info_util.load_from_env_variables()


@task
def run_ta2_test_server():
    """Run an external server on 45042 to return gRPC TA2TA3 api calls"""

    run_cmd = 'cd tworaven_apps/ta2_interfaces; python test_server.py'
    local(run_cmd)

@task
def get_run_flask_R_cmd():
    """For running the R flask server via the command line"""
    return 'cd R; python runner.py'

@task
def run_R():
    """Run the R flask server via the command line"""
    local(get_run_flask_R_cmd())

@task
def get_run_flask_automl_cmd():
    """For running the automl flask server via the command line"""
    return 'cd automl; python runner.py'

@task
def run_automl():
    """Run the automl flask server via the command line"""
    local(get_run_flask_automl_cmd())

@task
def run_with_ta2():
    """Assumes there's a TA2 running at localhost:45042"""
    run(external_ta2=True)

@task
def load_eventdata_dev():
    """Load the AppConfiguration for EventData dev"""
    from tworaven_apps.configurations.models import AppConfiguration

    check_config()  # make sure config file is loaded

    le_config = AppConfiguration.objects.get(pk=4)  # let it blow up if not found...
    le_config.is_active = True
    le_config.save()

    print('new config activated: ')
    le_config.print_vals()

@task
def run_eventdata_dev():
    """Set the UI mode to EventData with .js using a local flask url"""
    os.environ.setdefault(KEY_DJANGO_SETTINGS_MODULE,
                          'tworavensproject.settings.local_event_data_settings')
    init_db()

    load_eventdata_dev()

    run_event_data()

@task
def load_eventdata_prod():
    """Load the AppConfiguration for EventData prod"""
    from tworaven_apps.configurations.models import AppConfiguration

    check_config()  # make sure config file is loaded

    le_config = AppConfiguration.objects.get(pk=5)   # let it blow up if not found...
    le_config.is_active = True
    le_config.save()

    print('new config activated: ')
    le_config.print_vals()

@task
def run_eventdata_prod():
    """Set the UI mode to EventData with .js using a local flask url"""
    init_db()

    load_eventdata_prod()

    run()

@task
def run_event_data_2020(**kwargs):
    """Run the django dev server and webpack--webpack watches the assets directory
    and rebuilds when app TwoRavens changes
    """
    evtdata_settings_str = 'tworavensproject.settings.local_event_data_settings'

    os.environ.setdefault(KEY_DJANGO_SETTINGS_MODULE, evtdata_settings_str)

    django.setup()

    settings_str = f'--settings={evtdata_settings_str}'
    clear_js()  # clear any dev css/js files

    local(f"python manage.py check {settings_str}")
    local(f"python manage.py migrate {settings_str}")

    # local(f"python manage.py createsuperuser --noinput {settings_str}")
    #create_django_superuser()

    local((f'python manage.py loaddata'
           f' tworaven_apps/configurations/fixtures/initial_configs_evtdata.json'
           f' {settings_str}'))

    commands = [
        # start webpack
        'npm start',
    ]

    proc_list = [subprocess.Popen(command, shell=True, stdin=sys.stdin, stdout=sys.stdout, stderr=sys.stderr) for command in commands]
    try:
        local(f'python manage.py runserver 0.0.0.0:8070 {settings_str}')
    finally:
        for proc in proc_list:
            os.kill(proc.pid, signal.SIGKILL)

@task
def run(**kwargs):
    """Run the django dev server and webpack--webpack watches the assets directory and rebuilds when appTwoRavens changes

    with_R=True - runs flask R server
    """
    with_R = kwargs.get('with_R', False)
    external_ta2 = kwargs.get('external_ta2', False)

    clear_js()  # clear any dev css/js files
    init_db()
    check_config()  # make sure the db has something
    check_datamarts()
    #load_d3m_config_from_env() # default the D3M setting to the env variable
    #ta3_listener_add() # add MessageListener object

    commands = [
        # start webpack
        'npm start',
    ]

    if with_R:
        commands.append(get_run_flask_R_cmd())

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
    from tworaven_apps.utils.random_info import get_alphanumeric_string
    redis_clear()

    #celery_cmd = ('export TA2_STATIC_TEST_MODE=False;'
    #              'celery -A tworavensproject worker -l info')
    export_line = ''
    if ta2_external:
        export_line = 'export TA2_STATIC_TEST_MODE=False;'

    celery_cmd = ('%s'
                  'celery -A tworavensproject worker'
                  ' -l info -n worker_%s@%%h') % \
                  (export_line, get_alphanumeric_string(6),)

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
    if not settings.ALLOW_FAB_DELETE:
        print('For testing! Task only available if ALLOW_FAB_DELETE = True')
        return

    from tworaven_apps.eventdata_queries.models import EventDataSavedQuery

    mcnt = EventDataSavedQuery.objects.count()
    print('\n%d Eventdata Objects(s) found' % mcnt)
    if mcnt > 0:
        for meta_obj in EventDataSavedQuery.objects.all().order_by('-id'):
            meta_obj.delete()
        print('Deleted...')
    else:
        print('No EventData objects found.\n')

def set_django_site(domain, name):
    """Update the current django Site object"""
    assert domain, '"domain" must have a value'
    assert name, '"name" must have a value'

    from django.contrib.sites.models import Site
    site = Site.objects.get_current()

    site.domain = domain
    site.name = name
    site.save()

    print('Site updated!')
    print(' -- domain: ', site.domain)
    print(' -- name: ', site.name)

@task
def set_dev_site():
    """Set the current Site to '127.0.0.1:8080'"""
    set_django_site('127.0.0.1:8080',
                    '127.0.0.1:8080')

@task
def set_eventdata_public_site():
    """Set the current Site to 'eventdata.2ravens.org'"""
    set_django_site('eventdata.2ravens.org',
                    'eventdata.2ravens.org')

@task
def set_2ravens_public_site():
    """Set the current Site to '2ravens.org'"""
    domain_name = os.environ.get('RAVENS_SERVER_NAME',
                                 '2ravens.org')
    set_django_site(domain_name,
                    domain_name)


@task
def clear_ta2_stored_requests():
    """Delete StoredResponse and StoredRequest objects"""
    from django.conf import settings
    if not settings.ALLOW_FAB_DELETE:
        print('For testing! Task only available if ALLOW_FAB_DELETE = True')
        return

    from tworaven_apps.ta2_interfaces.models import StoredRequest, StoredResponse

    for model_name in [StoredResponse, StoredRequest]:
        mcnt = model_name.objects.count()
        print('\n%d %s objects(s) found' % (mcnt, model_name.__name__))
        if mcnt > 0:
            for meta_obj in model_name.objects.all().order_by('-id'):
                meta_obj.delete()
            print('Deleted...')
        else:
            print('No %s objects found.\n' % (model_name.__name__,))


@task
def clear_archive_queries():
    """Delete ArchiveQueryJob objects"""
    from django.conf import settings
    if not settings.ALLOW_FAB_DELETE:
        print('For testing! Task only available if ALLOW_FAB_DELETE = True')
        return

    from tworaven_apps.eventdata_queries.models import ArchiveQueryJob

    mcnt = ArchiveQueryJob.objects.count()
    print('\n%d ArchiveQueryJob archive Objects(s) found' % mcnt)
    if mcnt > 0:
        for meta_obj in ArchiveQueryJob.objects.all().order_by('-id'):
            meta_obj.delete()
        print('Deleted...')
    else:
        print('No ArchiveData objects found.\n')
