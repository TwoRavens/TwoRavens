from os.path import isfile, isdir, join
import json
from datetime import datetime
from collections import OrderedDict
from django.core.management.base import BaseCommand, CommandError
from tworaven_apps.configurations.models_d3m import \
    (D3MConfiguration, D3M_SEARCH_CONFIG_NAME)
from tworaven_apps.configurations.env_config_loader import EnvConfigLoader


class Command(BaseCommand):
    help = ('Create a D3MConfiguration object based on a diretory name.'
            ' This is for working with local test data--not k8s')

    def add_arguments(self, parser):
        """The first (and required) argument to this command is the
        file path to a JSON config file"""
        parser.add_argument('data_directory',
                            nargs='+',
                            type=str,
                            help=('Path to a data directory containing'
                                  ' TRAIN directory'))

    def handle(self, *args, **options):
        """Load the config file"""
        for data_dir in options['data_directory']:

            # Is this a legit file path?
            #
            if not isdir(data_dir):
                if isfile(data_dir):
                    raise CommandError(('Please specify a data directory, NOT a'
                                        ' file:  "%s"') %\
                                        data_dir)
                raise CommandError(('This data directory was not found: "%s".'
                                    ' Please check that the path is correct.') %\
                                    data_dir)

            loader_info = EnvConfigLoader.make_config_from_directory(data_dir)
            if not loader_info.success:
                raise CommandError('Failed: %s' % loader_info.err_msg)

            d3m_config = loader_info.result_obj

            # It worked!!
            #
            success_msg = ('Successfully loaded new D3M configuration: "%s"'
                           '\nD3M config values: \n\n%s\n\n') % \
                           (d3m_config,
                            d3m_config.get_json_string())

            success_msg = ('(%s) Successfully loaded new'
                           ' D3M configuration: "%s"') %\
                          (d3m_config, datetime.now())

            self.stdout.write(self.style.SUCCESS(success_msg))


            # For TA3 search, this runs a flask listener
            self.run_additional_instructions()


    def run_additional_instructions(self, *args, **kwargs):
        """Add any additional coding instructions here"""
        pass
