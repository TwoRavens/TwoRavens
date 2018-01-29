"""
Load the config and run the flask app
"""
from os.path import abspath, join, dirname
from tworaven_apps.configurations.management.commands import d3m_load_config
from fabric.api import local

class Command(d3m_load_config.Command):
    """This is the same as the "d3m_load_config" command except
       it also runs a small flask server that recevies messages
       from the main TwoRavens system."""

    def run_additional_instructions(self, *args, **kwargs):
        """Add any additional coding instructions here"""
        current_dir = dirname(dirname(dirname(abspath(__file__))))

        flask_cmd = ('cd %s;'
                     'FLASK_APP=ta3_listener.py flask run -p8001') % \
                     (current_dir)
        """
        success_msg = kwargs.get('success_msg')
        if success_msg:
            show_msg = "echo '%s';" % success_msg
        else:
            show_msg = ''

        flask_cmd = ("%scd %s; echo '--- ta3_search running... ---\';"
                     'FLASK_APP=ta3_listener.py flask run -p8001') % \
                     (show_msg, current_dir,)
        """
        local(flask_cmd)
