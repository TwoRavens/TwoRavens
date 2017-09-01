import os
#from os.path import abspath, dirname, join
import signal
import sys
from fabric.api import local, run, env
import subprocess
import re


long_cmd = """echo "--------------------------------"
echo "-- Create the 2ravens virtualenv"
echo "--------------------------------"
source /root/.bashrc
cd /srv/webapps/TwoRavens
mkvirtualenv -p python3 2ravens
pip3 install -r requirements/prod.txt
source /srv/.virtualenvs/2ravens/bin/activate
export DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container >> /srv/.virtualenvs/2ravens/bin/postactivate
source /srv/.virtualenvs/2ravens/bin/postactivate
echo "--------------------------------"
echo "-- Create the 2ravens virtualenv"
echo "--------------------------------"
fab init_db
echo "--------------------------------"
echo "-- Create the 2ravens virtualenv"
echo "--------------------------------"
"""
#fab ubuntu_help

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

def run_it():
    local(fmt_cmd, shell=bash_str)

if __name__ == '__main__':
    print(fmt_cmd)
'''



def virtualenv_start():
    """Make the virtualenv"""
    env.shell = "/bin/bash -l -i -c"
    bash_str = '/bin/bash'

    local('ln -sf /usr/bin/python3 /usr/bin/python')
    local('pip3 install virtualenvwrapper==4.7.2')
    local('mkdir -p /srv/.virtualenvs')
    local('mkdir -p /srv/Devel')
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



    mkdir /srv/webapps/scripts
    pip3 install Fabric3==1.13.1.post1 && \
    mkdir /srv/.virtualenvs && \
    mkdir /srv/Devel && \
    cp /root/.bashrc /root/.bashrc-org && \
    echo 'export WORKON_HOME=/srv/.virtualenvs' >> /root/.bashrc && \
    echo 'export PROJECT_HOME=/srv/Devel' >> /root/.bashrc && \
    echo 'export VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3' >> /root/.bashrc

#RUN export WORKON_HOME=/srv/.virtualenvs && \
#    export PROJECT_HOME=/srv/Devel && \
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
    echo 'export DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container' >> /srv/.virtualenvs/2ravens/bin/postactivate && \
    source /srv/.virtualenvs/2ravens/bin/postactivate && \
    fab init_db
'''
