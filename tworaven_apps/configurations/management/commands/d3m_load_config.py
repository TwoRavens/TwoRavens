from os.path import isfile, isdir
import json
from collections import OrderedDict
from django.core.management.base import BaseCommand, CommandError
from tworaven_apps.configurations.management.commands import load_config

class Command(load_config.Command):
    """This is the same as the "load_config" command except it crashes
       with bad paths"""

    def warn_invalid_paths(self, config_file, bad_paths):
        """Show bad path message AND crash"""

        # Call the parent method which shows a warning'
        #
        super(Command, self).warn_invalid_paths(config_file, bad_paths)

        err_msg2 = ('The config was not loaded.'
                    ' Please use a config file with accessible paths.')

        raise CommandError(err_msg2)
        #self.stdout.write(err_msg)
