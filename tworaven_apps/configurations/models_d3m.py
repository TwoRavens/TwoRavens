"""
https://datadrivendiscovery.org/wiki/display/gov/TA2+Configuration+file+syntax
See:
https://datadrivendiscovery.org/wiki/pages/viewpage.action?spaceKey=gov&title=Dataset+Directory+Structure
"""
from collections import OrderedDict
from datetime import datetime as dt
from os.path import join
import json
import jsonfield
from django.db import models
from django.urls import reverse
from django.utils.text import slugify

from model_utils.models import TimeStampedModel

from django.db import transaction
from django.conf import settings

from tworaven_apps.utils.file_util import create_directory
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.configurations.util_path_check import are_d3m_paths_valid,\
    get_bad_paths, get_bad_paths_for_admin
from tworaven_apps.configurations import static_vals as cstatic
from tworaven_apps.configurations.static_vals import \
    (KEY_D3MINPUTDIR, KEY_D3M_DIR_ADDITIONAL_INPUTS)
KEY_DATASET_SCHEMA = 'dataset_schema'

KEY_PROBLEM_SCHEMA = 'problem_schema'
KEY_PROBLEM_SCHEMA_URL = 'problem_schema_url'

KEY_PROBLEM_DATA_INFO = 'problem_data_info'

KEY_TIMEOUT = 'timeout'
KEY_CPUS = 'cpus'
KEY_RAM = 'ram'


D3M_FILE_ATTRIBUTES = [KEY_DATASET_SCHEMA, KEY_PROBLEM_SCHEMA]

D3M_DIR_USER_PROBLEMS_ROOT = 'problems'

# /output - for testing only
OPTIONAL_DIR_OUTPUT_ROOT = 'root_output_directory'


D3M_DIR_ATTRIBUTES = ['training_data_root',
                      'pipeline_logs_root', 'executables_root',
                      cstatic.KEY_D3M_USER_PROBLEMS_ROOT]
D3M_VALUE_ATTRIBUTES = [KEY_TIMEOUT, KEY_CPUS, KEY_RAM]
D3M_REQUIRED = D3M_FILE_ATTRIBUTES + ['training_data_root',]

EVAL_ATTRIBUTES_TO_REMOVE = [KEY_PROBLEM_SCHEMA,
                             KEY_PROBLEM_SCHEMA_URL] + \
                            D3M_VALUE_ATTRIBUTES

# 8/9/2018 - D3M config change
#
D3M_REQUIRED.remove(KEY_PROBLEM_SCHEMA)

# environment variable name to store a d3m config filepath for startup
CONFIG_JSON_PATH = 'CONFIG_JSON_PATH'
D3M_SEARCH_CONFIG_NAME = 'search_config.json'


class D3MConfiguration(TimeStampedModel):
    """
    Allow settings of javascript global variables via the database.
    These are used within the index.html template (for now)

    example from: https://datadrivendiscovery.org/wiki/display/gov/TA2+Configuration+file+syntax
    {
    "problem_schema": "/baseball/problemSchema.json",
    "dataset_schema": "/baseball/data/dataSchema.json",
    "training_data_root": "/baseball/data",
    "pipeline_logs_root": "/outputs/logs",
    "executables_root": "/outputs/executables",
    }
    """
    name = models.CharField('Dataset Id',
                            max_length=255,
                            help_text='This is same as dataset_id for now',
                            unique=True)

    # -------------------------------
    # Next 2 fields a temp hack to get UserWorkspace going
    # -------------------------------
    #dataset_id = models.CharField(\
    #                        max_length=255,
    #                        help_text='from the problem doc')

    orig_dataset_id = models.CharField(\
                            max_length=255,
                            default="default: not set",
                            help_text='from the problem doc')

    is_user_config = models.BooleanField(\
                    default=False,
                    help_text='If true, must be used through a UserWorkspace')
    # -------------------------------

    description = models.CharField(\
                            max_length=255,
                            help_text='For internal use',
                            blank=True)

    is_default = models.BooleanField(\
                    default=False,
                    help_text='There can be either one default or no defaults')

    is_selectable_dataset = models.BooleanField(\
                    default=True,
                    help_text='The user may choose this datast from a list')

    d3m_input_dir = models.TextField(KEY_D3MINPUTDIR,
                                     blank=True,
                                     help_text='Added in 2019 config.')

    dataset_schema = models.TextField(\
                        help_text='Input: Path to the dataset schema')

    problem_schema = models.TextField(\
                        cstatic.KEY_D3MPROBLEMPATH,
                        blank=True,
                        help_text='Input: Path to the problem schema')

    training_data_root = models.TextField(\
                        'input_root',
                        blank=True,
                        help_text=('Input: Path to the root directory of the'
                                   ' dataset described by dataset_schema'))

    root_output_directory = models.TextField(\
                        cstatic.KEY_D3MOUTPUTDIR,
                        blank=True,
                        help_text=(('Not an official field.  Used for testing'
                                    ' to determine the "/output" directory')))

    executables_root = models.TextField(\
                        blank=True,
                        help_text=('Output: Directory in which to write'
                                   ' the Test Executables.'))

    pipeline_logs_root = models.TextField(\
                        blank=True,
                        help_text=('Output: Path at which performers'
                                   ' should write the pipeline list,'
                                   ' output described in Section 4.1.3'))

    user_problems_root = models.TextField(\
                    blank=True,
                    help_text=('Directory in which to write user'
                               ' - (or system-) generated problems'
                               ' for the part of TA(3+2) that involves'
                               ' generating additional problems.'))

    additional_inputs = models.TextField(\
                        blank=True,
                        help_text=('Additional inputs directory'))

    timeout = models.BigIntegerField(\
                default=-1,
                help_text=('Allotted time for search, in seconds.'
                           ' No timeout if negative.'))

    cpus = models.CharField(\
                max_length=255,
                blank=True,
                help_text=('Number of cpus available for search.'))

    ram = models.CharField(\
                max_length=255,
                blank=True,
                help_text=('Amount of RAM available for search.'))

    env_values = jsonfield.JSONField(\
                blank=True,
                help_text='D3M env values for running Docker TA2s',
                load_kwargs=dict(object_pairs_hook=OrderedDict))

    slug = models.SlugField(blank=True,
                            max_length=255,
                            help_text='auto-filled on save')

    def __str__(self):
        if self.id:
            return f'{self.name} (id: {self.id})'
        return self.name

    class Meta:
        ordering = ('-is_default', 'name', '-modified')
        verbose_name = 'D3M Configuration'
        verbose_name_plural = 'D3M Configurations'

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.name:
            time_now = dt.now().strftime('%Y-%m-%d_%H-%M-%S')
            self.name = 'config_%s' % time_now

        self.slug = slugify(self.name)

        # A user config CANNOT be the default
        #
        if self.is_user_config:
            self.is_default = False
            self.is_selectable_dataset = False

        # If this is the default, set everything else to non-default
        if self.is_default:
            qs = D3MConfiguration.objects.filter(is_default=True)
            if self.id:
                qs = qs.exclude(id=self.id)
            qs.update(is_default=False)

        super(D3MConfiguration, self).save(*args, **kwargs)

    @staticmethod
    def set_as_default(d3m_config):
        if not isinstance(d3m_config, D3MConfiguration):
            return err_resp('"d3m_config" is not a D3MConfiguration object')

        d3m_config.is_default = True
        d3m_config.save()

        if d3m_config.is_default:
            return ok_resp('Default set!')

        return err_resp('Default NOT set. Save failed.')

    def get_temp_directory(self):
        """This is a July 2020 addition b/c of the change in directory structure"""
        if self.root_output_directory:
            temp_dir = join(self.root_output_directory, cstatic.TEMP_DIR_NAME)
        else:
            temp_dir = join(settings.RAVENS_TEST_OUTPUT_DIR, cstatic.TEMP_DIR_NAME)

        path_info = create_directory(temp_dir)
        # Should check for an error here...
        #if path_info.er

        return temp_dir


    def get_json_string(self, indent=2):
        """Return json string"""
        return json.dumps(self.to_dict(), indent=indent)

    def to_dict(self, as_eval_dict=False):
        """Return in an OrderedDict"""
        attrs = ['id', 'name', 'is_default',
                 'is_user_config', 'orig_dataset_id',
                 'description',
                 'd3m_input_dir',
                 'dataset_schema', 'problem_schema',
                 'training_data_root',
                 'pipeline_logs_root', 'executables_root',
                 'user_problems_root',
                 'additional_inputs',
                 OPTIONAL_DIR_OUTPUT_ROOT,
                 'timeout', 'cpus', 'ram', 'env_values']
        date_attrs = ['created', 'modified']

        od = OrderedDict()
        for name in attrs + date_attrs:
            val = self.__dict__.get(name, None)
            if val and name in date_attrs:
                val = str(val)
            od[name] = val

        od['dataset_schema_url'] = reverse('view_get_dataset_schema_by_id',
                                           kwargs=dict(d3m_config_id=self.id))



        od[KEY_PROBLEM_SCHEMA_URL] = reverse('view_get_problem_schema_by_id',
                                             kwargs=dict(d3m_config_id=self.id))

        od[KEY_PROBLEM_DATA_INFO] = reverse('view_get_problem_data_info_by_id',
                                            kwargs=dict(d3m_config_id=self.id))

        od['config_url'] = reverse('view_d3m_details_json',
                                   kwargs=dict(d3m_config_id=self.id))

        # Last minute add: 8/10/2018
        # - remove attributes for an eval search_config
        #
        if as_eval_dict:
            for remove_key in EVAL_ATTRIBUTES_TO_REMOVE:
                od.pop(remove_key, None)    # pop it!


        return od

    def get_docker_env_settings(self):
        """Used for local TA2 tests and setting env variables"""
        if not self.env_values:
            return None

        pairs = ['-e %s=%s' % (key, val)
                 for key, val in self.env_values.items()]

        return ' '.join(pairs)


    def are_d3m_paths_valid(self):
        """Check the paths"""
        return are_d3m_paths_valid(self)

    #@mark_safe
    def are_paths_valid(self):
        """Check the paths, show in admin"""
        if not self.are_d3m_paths_valid():
            return False
            #return "<span class='deletelink'>invalid paths</a>"
        else:
            return True
    #are_paths_valid.allow_tags = True

    def get_bad_paths_for_admin(self):
        """Formatted for the admin with <br />'s separating the path list"""
        return get_bad_paths_for_admin(self)
    get_bad_paths_for_admin.allow_tags = True

    def get_bad_paths_with_html(self):
        """Return a list of bad paths, used if "are_d3m_paths_valid" fails"""
        return get_bad_paths(self, with_html=True)
    get_bad_paths_with_html.allow_tags = True

    def get_bad_paths(self, with_html=False):
        """Return a list of bad paths, used if "are_d3m_paths_valid" fails"""
        return get_bad_paths(self, with_html)

    @staticmethod
    def create_config_from_dict(d3m_dict, is_default=False):
        """Create a D3MConfiguration from a python dict.
        success: returns (D3MConfiguration, None)
        failure: returns (None, 'error message string')
        """

        d3m_config = D3MConfiguration()

        # Check for required fields
        #
        for key in D3M_REQUIRED:
            val = d3m_dict.get(key, None)
            if val is None:
                return None, \
                       ' "%s" was not defined.  This field is required.' % key

        # Load the fields, defaulting to "" (blank)
        #
        d3m_config_attrs = D3M_FILE_ATTRIBUTES + \
                           D3M_DIR_ATTRIBUTES + \
                           [OPTIONAL_DIR_OUTPUT_ROOT]
        for key in d3m_config_attrs:
            val = d3m_dict.get(key, '')
            d3m_config.__dict__[key] = val

        # config name
        # ---------------------------------
        # Is the name in the dict?
        config_name = d3m_dict.get('name', None)
        time_now = dt.now().strftime('%Y-%m-%d_%H-%M-%S')
        if config_name:
            # Name is in the dict, does it already exist?
            if D3MConfiguration.objects.filter(name=config_name).count() > 0:
                # Yes, add a timestamp to name
                config_name = '%s_%s' % (config_name, time_now)
        else:
            # No name, make a timestamped name
            config_name = 'config_%s' % time_now

        # Set the name
        d3m_config.name = config_name

        # should this become the default config?
        #
        if is_default:
            d3m_config.is_default = True

        # save it
        #
        d3m_config.save()

        return d3m_config, None
