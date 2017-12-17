from os.path import isfile, isdir
import json
from collections import OrderedDict
from django.core.management.base import BaseCommand, CommandError
from tworaven_apps.configurations.models_d3m import D3MConfiguration

class Command(BaseCommand):
    help = ('Spin off a python httpServer to receive callbacks to window')

    # skip for now
    def xadd_arguments(self, parser):
        """The first (and required) argument to this command is the
        file path to a JSON config file"""
        parser.add_argument('config_file',
                            nargs='+',
                            type=str,
                            help='Path to a config file in JSON format')

    def handle(self, *args, **options):
        """Load the config file"""
        print('hi there')
        self.stdout.write(self.style.SUCCESS('hey'))
