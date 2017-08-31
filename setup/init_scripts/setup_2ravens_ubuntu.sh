#!/bin/bash

echo "--------------------------------"
echo "-- Create the 2ravens virtualenv"
echo "--------------------------------"

source /root/.bashrc
cd /srv/webapps/TwoRavens
mkvirtualenv -p python3 2ravens
pip3 install -r requirements/prod.txt
source /root/virtualenvs/2ravens/bin/activate
export DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container >> /root/virtualenvs/2ravens/bin/postactivate
source /root/virtualenvs/2ravens/bin/postactivate

echo "--------------------------------"
echo "-- Create the 2ravens virtualenv"
echo "--------------------------------"
fab init_db

echo "--------------------------------"
echo "-- Create the 2ravens virtualenv"
echo "--------------------------------"
