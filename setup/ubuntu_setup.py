"""
Working on a config file.  Some of this logic will eventually replace:

https://github.com/vjdorazio/TwoRavens/blob/master/install.pl

For now, replicating much of logic in the file above

"""
import os, sys
from os.path import isfile, isdir, join
import shutil

def msg(s): print(s)
def dashes(char='-'): msg(40*char)
def msgt(s): dashes(); msg(s); dashes()
def msgd(s): dashes(); msg(s)
def msgx(s): dashes('+'); msg(s); dashes('\/'); sys.exit(0)


# Location of github repository
TWORAVENS_GIT_REPO = '/srv/webapps/TwoRavens'
# Rook directory within the github repository
TWORAVENS_GIT_REPO_ROOK_DIR = join(TWORAVENS_GIT_REPO, 'rook')

APACHE_CONFIG_DIRECTORY = '/etc/httpd'
APACHE_WEB_DIRECTORY = '/var/www/html'
# Deployed rook directory (target dir)
TWORAVENS_STATIC_DIRECTORY = join(APACHE_WEB_DIRECTORY, '2ravens', 'static')
TWORAVENS_WORKING_ROOK_DIRECTORY = join(APACHE_WEB_DIRECTORY, '2ravens', 'rook')

TWORAVENS_URL = 'http://0.0.0.0:8080'
DATAVERSE_URL = 'http://beta.dataverse.org'

APACHE_USERNAME = 'www-data'


class TwoRavensSetup:

    def __init__(self, **kwargs):
        """set up for RAapche"""
        self.init_dirs()
        self.create_app_directories()
        self.update_rook_files()

    def init_dirs(self):
        """(1) Check/Create directories"""
        msgt(self.init_dirs.__doc__)

        # Check for the TwoRavens repository
        #
        if not isdir(TWORAVENS_GIT_REPO):
            msgx('Directory not found: %s' %  TWORAVENS_GIT_REPO)

        # needs to be created for new install
        #
        self.make_dir(TWORAVENS_WORKING_ROOK_DIRECTORY)
        self.make_dir(TWORAVENS_STATIC_DIRECTORY)


    def update_apache_conf(self):
        """Install the rApache config file"""
        msgt(self.update_apache_conf.__doc__)


    def create_app_directories(self):
        """(2) Creating application directories on the filesystem"""
        msgt(self.create_app_directories.__doc__)

        app_dirnames = ['pic_dir', 'preprocess_dir', 'log_dir']

        for app_dir in app_dirnames:
            full_dirname = join(APACHE_WEB_DIRECTORY, 'custom', app_dir)
            self.make_dir(full_dirname)

            # update the permissions
            perm_cmd = 'chown -R :{0} {1}'.format(\
                            APACHE_USERNAME,
                            full_dirname)
            msg('update permissions: %s' % perm_cmd)
            os.system(perm_cmd)


    def update_rook_files(self):
        """(3) Configure R files, set them to production mode, update variables"""
        msgt(self.update_rook_files.__doc__)

        rook_files = [x for x in os.listdir(TWORAVENS_GIT_REPO_ROOK_DIR)
                   if x.endswith('.R')]

        for rook_file in rook_files:
            msg('configure file: %s' % rook_file)

            # open file
            orig_file = join(TWORAVENS_GIT_REPO_ROOK_DIR, rook_file)

            # read/update content
            content = open(orig_file, 'r').read()
            content = self.update_rook_file_content(content)

            # write new file
            new_file_location = join(TWORAVENS_WORKING_ROOK_DIRECTORY, rook_file)
            open(new_file_location, 'w').write(content)

        # Copy directories: preprocess and privacyfunctions
        #
        for rook_dir in ['preprocess', 'privacyfunctions']:
            orig_dir = join(TWORAVENS_GIT_REPO_ROOK_DIR, rook_dir)
            dest_dir = join(TWORAVENS_WORKING_ROOK_DIRECTORY, rook_dir)
            msg('\nDirectory copy...\nsrc: %s\ndest: %s' % (orig_dir, dest_dir))
            shutil.copytree(orig_dir, dest_dir)
            msg('Directory copied.')


    def update_rook_file_content(self, content):
        """Make updates to the rook files--this needs to change in near future
        with environment variables or at least variables in only 1 R file"""

        replacements = {}
        # set production flag
        replacements['production<-FALSE'] = 'production<-TRUE'

        # rApache url for the preprocess/subset directory and generated images/graphs
        replacements['https://beta.dataverse.org'] = DATAVERSE_URL

        # TwoRavens working directory
        replacements['/var/www/html/dataexplore/rook'] = TWORAVENS_WORKING_ROOK_DIRECTORY

        for orig_str, new_str in replacements.items():
            content = content.replace(orig_str, new_str)

        return content


    def make_dir(self, new_dirname):
        """Convenience method to create directory"""

        if isdir(new_dirname):
            msg('directory exists: %s' % new_dirname)
            return

        os.makedirs(new_dirname)
        msg('directory created: %s' % new_dirname)

if __name__ == '__main__':
    trs = TwoRavensSetup()
