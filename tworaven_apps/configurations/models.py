from django.db import models
from model_utils.models import TimeStampedModel
from django.db import transaction
from tworaven_apps.utils.js_helper import get_js_boolean
from tworaven_apps.utils.url_helper import add_trailing_slash,\
    remove_trailing_slash

# for conversion to .js values
APP_CONFIG_BOOLEAN_FIELDS = (\
                'is_active', 'production',
                'd3m_mode', 'privacy_mode')

class AppConfiguration(TimeStampedModel):
    """
    Allow settings of javascript global variables via the database.
    These are used within the index.html template (for now)
    """
    name = models.CharField(max_length=255,
                            help_text='e.g. "Dev Configuration"',
                            unique=True)

    is_active = models.BooleanField(\
                    default=False,
                    help_text=('Make this the active configuration.'
                               ' Once saved, any other configurations'
                               ' will be deactivated--but may be reused'))

    production = models.BooleanField(\
                    'Production',
                    help_text=(('.js variable "production".'
                                ' True -> data, metadata from live'
                                ' server resources instead of local versions')))

    d3m_mode = models.BooleanField(\
                    'D3M mode',
                    help_text='.js variable "d3m". Are D3M services active?')

    d3m_url = models.URLField(\
                    'D3M url',
                    default='http://127.0.0.1:8080/d3m-service/',
                    help_text=('URL used to make calls that'
                               ' are converted to gRPC messages'
                               ' and sent to D3M applications'))

    privacy_mode = models.BooleanField(\
                    'Privacy (PSI) mode',
                    help_text='.js variable "privacy". Is the PSI tool available?')

    rook_app_url = models.URLField(\
                    'rappURL (rook apps)',
                    default='http://127.0.0.1:8080/rook-custom/',
                    help_text=(('URL to the rook server.'
                                ' examples: https://beta.dataverse.org/custom/,'
                                ' http://127.0.0.1:8080/rook-custom/')))

    dataverse_url = models.URLField(\
                    'dataverse url',
                    help_text=(('URL to Dataverse'
                                'examples: https://beta.dataverse.org,'
                                'https://dataverse.harvard.edu')))

    description = models.TextField(blank=True, help_text=('optional'))

    @transaction.atomic
    def save(self, *args, **kwargs):

        # make sure the rook url has a trailing slash
        #
        self.rook_app_url = add_trailing_slash(self.rook_app_url)

        # make sure the dataverse_url and d3m urls DON'T HAVE a trailing slash
        # (This will get worked out soon...)
        #
        self.dataverse_url = remove_trailing_slash(self.dataverse_url)
        self.d3m_url = remove_trailing_slash(self.d3m_url)

        if self.is_active:
            # If this is active, set everything else to inactive
            AppConfiguration.objects.filter(\
                    is_active=True\
                    ).update(is_active=False)
        super(AppConfiguration, self).save(*args, **kwargs)

    class Meta:
        verbose_name = 'Two Ravens UI Configuration'
        verbose_name_plural = 'Two Ravens UI Configurations'
        db_table = 'tworavens_config'
        ordering = ('-is_active', )

    def __str__(self):
        return self.name

    @staticmethod
    def get_config():
        """
        Return the active config
        """
        return AppConfiguration.objects.filter(is_active=True).first()

    @staticmethod
    def get_config_for_js():
        """
        Return the active config
        """
        config = AppConfiguration.objects.filter(is_active=True).first()
        if not config:
            return None

        js_dict = {}
        for k, val in  config.__dict__.items():
            if k in APP_CONFIG_BOOLEAN_FIELDS:
                js_dict[k] = get_js_boolean(val)
            else:
                js_dict[k] = val
        return js_dict
