#!/bin/bash

# ------------------------------------
echo ">> Create the 2ravens virtualenv"
# ------------------------------------
source /root/.bashrc
source /usr/local/bin/virtualenvwrapper.sh
cd /srv/webapps/TwoRavens
mkvirtualenv -p python3 2ravens
pip3 install -r requirements/prod.txt

# ------------------------------------
echo ">> Set postactivate script"
# ------------------------------------
#source /root/virtualenvs/2ravens/bin/activate
export DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container >> /root/virtualenvs/2ravens/bin/postactivate
source /root/virtualenvs/2ravens/bin/postactivate

# ------------------------------------
echo ">> fab init_db"
# ------------------------------------
fab init_db

# ------------------------------------
echo ">> Rook setup (coming)"
# ------------------------------------
