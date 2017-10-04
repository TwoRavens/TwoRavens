"""
https://datadrivendiscovery.org/wiki/display/gov/TA2+Configuration+file+syntax
See:
https://datadrivendiscovery.org/wiki/pages/viewpage.action?spaceKey=gov&title=Dataset+Directory+Structure
"""
from collections import OrderedDict
from datetime import datetime as dt
import json

from django.db import models
from django.urls import reverse
from django.template.defaultfilters import slugify

from model_utils.models import TimeStampedModel
from django.db import transaction
from tworaven_apps.utils.js_helper import get_js_boolean
from tworaven_apps.utils.url_helper import add_trailing_slash,\
    remove_trailing_slash

from tworaven_apps.configurations.util_path_check import are_d3m_paths_valid,\
    get_bad_paths, get_bad_paths_for_admin

KEY_DATASET_SCHEMA = 'dataset_schema'
KEY_PROBLEM_SCHEMA = 'problem_schema'

D3M_FILE_ATTRIBUTES = (KEY_DATASET_SCHEMA, KEY_PROBLEM_SCHEMA)
D3M_DIR_ATTRIBUTES = ('training_data_root', 'executables_root',
                      'pipeline_logs_root', 'temp_storage_root')
D3M_REQUIRED = D3M_FILE_ATTRIBUTES + ('training_data_root',)

# environment variable name to store a d3m config filepath for startup
ENV_D3M_CONFIG_FILEPATH = 'ENV_D3M_CONFIG_FILEPATH'

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
    "temp_storage_root": "/temp"
    }
    """
    name = models.CharField(max_length=255,
                            help_text='for internal use',
                            unique=True)

    is_default = models.BooleanField(\
                    default=False,
                    help_text='There can be either one default or no defaults')

    dataset_schema = models.TextField(\
                        help_text='Input: Path to the dataset schema')

    problem_schema = models.TextField(\
                        help_text='Input: Path to the problem schema')

    training_data_root = models.TextField(\
                        help_text=('Input: Path to the root directory of the'
                                   ' dataset described by dataset_schema'))

    executables_root = models.TextField(\
                        blank=True,
                        help_text=('Output: Directory in which to write'
                                   ' the Test Executables.'))

    pipeline_logs_root = models.TextField(\
                        blank=True,
                        help_text=('Output: Path at which performers'
                                   ' should write the pipeline list,'
                                   ' output described in Section 4.1.3'))

    temp_storage_root = models.TextField(\
                        blank=True,
                        help_text=('Temporary storage root for performers'
                                   ' to use.'))

    slug = models.SlugField(blank=True,
                            help_text='auto-filled on save')

    def __str__(self):
        return self.name

    class Meta:
        ordering = ('name', '-modified')
        verbose_name = 'D3M Configuration'
        verbose_name_plural = 'D3M Configurations'

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.name:
            time_now = dt.now().strftime('%Y-%m-%d_%H-%M-%S')
            self.name = 'config_%s' % time_now

        self.slug = slugify(self.name)

        # If this is the default, set everything else to non-default
        if self.is_default:
            D3MConfiguration.objects.filter(\
                            is_default=True\
                            ).update(is_default=False)

        super(D3MConfiguration, self).save(*args, **kwargs)


    def get_json_string(self, indent=2):
        """Return json string"""
        return json.dumps(self.to_dict(), indent=2)

    def to_ta2_config_test(self, mnt_volume='/ravens_volume', save_shortened_names=False):
        """Return a dict in TA2 format to use with mounted volume"""
        od = OrderedDict()
        for name in D3M_FILE_ATTRIBUTES + D3M_DIR_ATTRIBUTES:
            val = self.__dict__.get(name, '(not set)')
            idx = val.find(mnt_volume)
            if idx > -1:
                val = val[idx:]
            od[name] = val
            if save_shortened_names:
                self.__dict__[name] = val
        if save_shortened_names:
            self.save()
        return od

    def to_dict(self):
        """Return in an OrderedDict"""
        attrs = ['id', 'name', 'is_default',
                 'dataset_schema', 'problem_schema', 'training_data_root',
                 'executables_root', 'pipeline_logs_root',
                 'temp_storage_root']
        date_attrs = ['created', 'modified']

        od = OrderedDict()
        for name in attrs + date_attrs:
            val = self.__dict__.get(name, None)
            if val and name in date_attrs:
                val = str(val)
            od[name] = val

        od['dataset_schema_url'] = reverse('view_get_dataset_schema_by_id',
                                           kwargs=dict(d3m_config_id=self.id))

        od['problem_schema_url'] = reverse('view_get_problem_schema_by_id',
                                           kwargs=dict(d3m_config_id=self.id))

        od['problem_data_info'] = reverse('view_get_problem_data_info_by_id',
                                          kwargs=dict(d3m_config_id=self.id))

        od['config_url'] = reverse('view_d3m_details_json',
                                   kwargs=dict(d3m_config_id=self.id))

        return od


    def are_d3m_paths_valid(self):
        """Check the paths"""
        return are_d3m_paths_valid(self)

    def are_paths_valid(self):
        """Check the paths, show in admin"""
        if not self.are_d3m_paths_valid():
            return "<span class='deletelink'>invalid paths</a>"
        else:
            return True
    are_paths_valid.allow_tags = True

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
        for key in D3M_FILE_ATTRIBUTES + D3M_DIR_ATTRIBUTES:
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
