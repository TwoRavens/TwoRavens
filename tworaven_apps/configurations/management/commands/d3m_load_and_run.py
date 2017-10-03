import os
from os.path import isfile, isdir
import json
from collections import OrderedDict
from django.core.management.base import BaseCommand, CommandError
from tworaven_apps.configurations.models_d3m import D3MConfiguration

class Command(BaseCommand):
    help = ('Load a D3M config file containing JSON to the database'
            ' by creating a new D3MConfiguration object'
            ' and setting it as the default D3MConfiguration.')

    def add_arguments(self, parser):
        """The first (and required) argument to this command is the
        file path to a JSON config file"""
        parser.add_argument('config_file_path',
                            nargs='+',
                            type=str,
                            help='Path to a config file in JSON format')

    def handle(self, *args, **options):
        """Load the config file"""
        for config_file_path in options['config_file_path']:

            # Is this a legit file path?
            #
            if not isfile(config_file_path):
                if isdir(config_file_path):
                    raise CommandError(('Please specify a config file, NOT a'
                                        ' directory:  "%s"') %\
                                        config_file_path)
                raise CommandError(('This config file was not found: "%s".'
                                    ' Please check that the path is correct.') %\
                                    config_file_path)

            # Is the file readable?
            #
            try:
                config_content = open(config_file_path, 'r').read()
            except:
                raise CommandError(('Failed to open the config file "%s".'
                                    ' Please check that it is readable.') %\
                                    config_file_path)
            # Is the file valid JSON?
            #
            try:
                config_dict = json.loads(config_content,
                                         object_pairs_hook=OrderedDict)
            except ValueError as err_obj:
                raise CommandError(('The config file did not contain valid JSON'
                                    ' "%s" (ValueError)') % config_file_path)
            except TypeError as err_obj:
                raise CommandError(('The config file did not contain valid JSON'
                                    ' "%s" (TypeError)') % config_file_path)

            # Use the dict to create a new D3MConfiguration
            #
            d3m_config, err_msg = D3MConfiguration.create_config_from_dict(\
                                        config_dict,
                                        is_default=True)

            # Did the file contain required paths?
            #
            if err_msg:
                raise CommandError(('Error in config file "%s".'
                                    '%s') % (config_file_path, err_msg))

            # Are the paths valid?
            #
            if not d3m_config.are_d3m_paths_valid():
                bad_paths = d3m_config.get_bad_paths()
                bad_path_list = '\n'.join(bad_paths)
                if len(bad_paths) == 1:
                    path_note = 'an invalid path'
                else:
                    path_note = '%d invalid paths' % len(bad_paths)
                raise CommandError(\
                    self.style.WARNING(\
                        ('WARNING. The config file "%s" contained %s:'
                         '\n\n%s'
                         '\n\nThese paths may be on an external volume'
                         ' which is not yet accessible.\n') % \
                        (config_file_path, path_note, bad_path_list)))

            # It worked!!
            #
            self.stdout.write(\
                self.style.SUCCESS(('Successfully loaded new D3M configuration:'
                                    ' "%s"') % d3m_config))

        # OK!  This 'ain't that pretty at all' but not much time left...
        #
        os.system(('cd /var/webapps/TwoRavens;'
                   'gunicorn --workers=2 tworavensproject.wsgi_dev_container'
                   ' -b 0.0.0.0:8080;'))
