#!/bin/bash

# -------------------------------
# Start-up server on GCE
# -------------------------------
cd /var/webapps/TwoRavens

# (1) clear any test data (shouldn't be any)
printf "\n(1) clear any test data (shouldn't be any)"
fab clear_test_data

# (2) Make D3M config files
printf "\n(2) Make D3M config files"
fab make_d3m_config_files

# (3) Copy data to ravens_volume
printf "\n(3) Copy data to ravens_volume"
cp -r /var/webapps/TwoRavens/ravens_volume/. /ravens_volume/

# (4) "Run web server.."
printf "\n(4) Run web server.."
setsid python manage.py runserver 0.0.0.0:8080
