#!/bin/bash

# ------------------------------------
echo "--> two ravens user"
# ------------------------------------
useradd -m -c "Two Ravens web user" 2ravens_user -s /bin/bash
usermod -a -G www-data 2ravens_user
usermod -a -G www-data root

# ------------------------------------
echo "--> virtualenvwrapper"
# ------------------------------------
pip3 install --upgrade pip
pip3 install Fabric3==1.13.1.post1
pip3 install virtualenvwrapper==4.7.2

# ------------------------------------
echo "--> directories and perms"
# ------------------------------------
mkdir -p /srv/.virtualenvs
chown -R 2ravens_user:www-data /srv/.virtualenvs
chmod -R og-r /srv/.virtualenvs

# ------------------------------------
mkdir -p /srv/Devel
chown -R 2ravens_user:www-data /srv/Devel
chmod -R og-r /srv/Devel

# ------------------------------------
chown -R 2ravens_user:www-data /srv/webapps
chmod -R og-r /srv/webapps

# ------------------------------------
echo "--> set virtualenvwrapper profile vars for root"
# ------------------------------------
echo WORKON_HOME=/srv/.virtualenvs >> /root/.profile
echo PROJECT_HOME=/srv/Devel >> /root/.profile
echo VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3 >> /root/.profile
echo VIRTUALENVWRAPPER_SCRIPT=/usr/local/bin/virtualenvwrapper.sh >> /root/.profile
echo source /usr/local/bin/virtualenvwrapper.sh >> /root/.profile

# ------------------------------------
echo "--> set virtualenvwrapper vars for 2ravens_user"
# ------------------------------------
echo WORKON_HOME=/srv/.virtualenvs >> /home/2ravens_user/.profile
echo PROJECT_HOME=/srv/Devel >> /home/2ravens_user/.profile
echo VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3 >> /home/2ravens_user/.profile
echo VIRTUALENVWRAPPER_SCRIPT=/usr/local/bin/virtualenvwrapper.sh >> /home/2ravens_user/.profile
echo source /usr/local/bin/virtualenvwrapper.sh >> /home/2ravens_user/.profile

# ------------------------------------
echo "--> Create the 2ravens virtualenv"
# ------------------------------------
#source /root/.bashrc
#source /usr/local/bin/virtualenvwrapper.sh
source /usr/local/bin/virtualenvwrapper.sh
#source /usr/local/bin/virtualenvwrapper.sh
source /home/2ravens_user/.profile
cd /srv/webapps/TwoRavens
mkvirtualenv -p python3 2ravens
pip3 install -r requirements/prod.txt

chown -R 2ravens_user:www-data /srv/.virtualenvs/2ravens
chmod -R og-r /srv/.virtualenvs/2ravens

# ------------------------------------
echo ">> Set postactivate script"
# ------------------------------------
#source /srv/.virtualenvs/2ravens/bin/activate
echo DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container >> /srv/.virtualenvs/2ravens/bin/postactivate

source /srv/.virtualenvs/2ravens/bin/activate
source /srv/.virtualenvs/2ravens/bin/postactivate

deactivate
workon 2ravens
pip freeze
# ------------------------------------
echo ">> fab init_db"
# ------------------------------------
fab init_db
fab ubuntu_help
# ------------------------------------
echo ">> Rook setup (coming)"
# ------------------------------------
