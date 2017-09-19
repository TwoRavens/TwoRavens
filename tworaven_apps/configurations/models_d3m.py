from datetime import datetime as dt
from collections import OrderedDict
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
    get_bad_paths

D3M_FILE_ATTRIBUTES = ('dataset_schema', 'problem_schema')
D3M_DIR_ATTRIBUTES = ('training_data_root', 'executables_root',
                      'pipeline_logs_root', 'temp_storage_root')

class D3MConfiguration(TimeStampedModel):
    """
    Allow settings of javascript global variables via the database.
    These are used within the index.html template (for now)
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
        ordering = ('is_default', 'name')

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

        od['config_url'] = reverse('view_d3m_details_json',
                                   kwargs=dict(d3m_config_id=self.id))

        return od

    def are_d3m_paths_valid(self):
        """Check the paths"""
        return are_d3m_paths_valid(self)

    def get_bad_paths(self):
        """Return a list of bad paths, used if "are_d3m_paths_valid" fails"""
        return get_bad_paths(self)

    class Meta:
        ordering = ('name', '-modified')
        verbose_name = 'D3M Configuration'
        verbose_name_plural = 'D3M Configurations'
