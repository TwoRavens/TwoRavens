import os
#from os.path import abspath, dirname, join

import signal

import sys
from fabric.api import local, run, env

#import django
import subprocess

import re

def get_virtual_env_exports():

    return ['export WORKON_HOME=/root/virtualenvs',
            'export PROJECT_HOME=/root/Devel',
            'export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3']

'''
pip3 install Fabric3==1.13.1.post1
python3
from fabric.api import local, run, env
#
long_cmd = """#
pip3 install virtualenvwrapper==4.7.2
mkdir -p /root/virtualenvs
mkdir -p /root/Devel
cp /root/.bashrc /root/.bashrc-org
#
#
#export WORKON_HOME=/root/virtualenvs
#export PROJECT_HOME=/root/Devel
#export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3
#
export WORKON_HOME=/root/virtualenvs >> /root/.bashrc
export PROJECT_HOME=/root/Devel >> /root/.bashrc
export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3 >> /root/.bashrc
#
# --------------------------------
# Set virtualenvwrapper variables
# --------------------------------
source /usr/local/bin/virtualenvwrapper.sh
source /root/.bashrc
ln -sf /usr/bin/python3 /usr/bin/python
# --------------------------------
# Create the 2ravens virtualenv
# --------------------------------
cd /srv/webapps/TwoRavens
mkvirtualenv -p python3 2ravens
pip3 install -r requirements/prod.txt
source /root/virtualenvs/2ravens/bin/activate
export DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container >> /root/virtualenvs/2ravens/bin/postactivate
source /root/virtualenvs/2ravens/bin/postactivate
# --------------------------------
# Check django and make the initial db
# --------------------------------
fab init_db
# --------------------------------
# Setup the rook files for apache
# --------------------------------
#fab ubuntu_help
"""

cmd_lines = [x.strip()
             for x in long_cmd.split('\n')
             if len(x.strip()) > 0]

# Add "&& \" to the end of each line--except the last one
#
cmd_lines = ['%s && \\' % x
             for x in cmd_lines[:-1]]\
             + [cmd_lines[-1]]

fmt_cmd = '\n'.join(cmd_lines)

bash_str = '/bin/bash'
local(fmt_cmd, shell=bash_str)

'''



def virtualenv_start():
    """Make the virtualenv"""
    env.shell = "/bin/bash -l -i -c"
    bash_str = '/bin/bash'

    local('ln -sf /usr/bin/python3 /usr/bin/python')
    local('pip3 install virtualenvwrapper==4.7.2')
    local('mkdir -p /root/virtualenvs')
    local('mkdir -p /root/Devel')
    local('cp /root/.bashrc /root/.bashrc-org')

    for stmt in get_virtual_env_exports():
        local("echo '%s' >> /root/.bashrc" % stmt)
        local(stmt)

    local("source /usr/local/bin/virtualenvwrapper.sh", shell=bash_str)
    local("source /root/.bashrc", shell=bash_str)

    local("cd /root")
    #local("sudo /bin/bash /root/.bashrc")
    local('cd /srv/webapps/TwoRavens')
    local('mkvirtualenv -p python3 2ravens', shell=bash_str)
    local('pip3 install -r requirements/prod.txt')


    '''
    mkdir /srv/webapps/scripts
    pip3 install Fabric3==1.13.1.post1 && \
    mkdir /root/virtualenvs && \
    mkdir /root/Devel && \
    cp /root/.bashrc /root/.bashrc-org && \
    echo 'export WORKON_HOME=/root/virtualenvs' >> /root/.bashrc && \
    echo 'export PROJECT_HOME=/root/Devel' >> /root/.bashrc && \
    echo 'export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3' >> /root/.bashrc

#RUN export WORKON_HOME=/root/virtualenvs && \
#    export PROJECT_HOME=/root/Devel && \
#    export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3 && \
#    /bin/bash -c "source /bin/bash /usr/local/bin/virtualenvwrapper.sh"  && \
#    /bin/bash -c "source /root/.bashrc"


# ---------------------------------------------
# Virtualenv creation
# ---------------------------------------------
RUN /bin/bash -c "source /bin/bash /usr/local/bin/virtualenvwrapper.sh"  && \
    /bin/bash -c "source /root/.bashrc"
    cd /srv/webapps/TwoRavens && \
    mkvirtualenv -p python3 2ravens && \
    pip3 install -r requirements/prod.txt && \
    echo 'export DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container' >> /root/virtualenvs/2ravens/bin/postactivate && \
    source /root/virtualenvs/2ravens/bin/postactivate && \
    fab init_db
'''
