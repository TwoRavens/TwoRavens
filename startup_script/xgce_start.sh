#!/bin/bash

# -------------------------------
# Start-up server on GCE
# -------------------------------
cd /var/webapps/TwoRavens

# (10) clear any test data (shouldn't be any)
printf "\n(10) clear any test data (shouldn't be any)"
fab clear_test_data

# (20) Make D3M config files
printf "\n(20) Make D3M config files"
fab make_d3m_configs_from_files

# (30) Copy data to ravens_volume
printf "\n(30) Copy data to ravens_volume"
cp -r /var/webapps/TwoRavens/ravens_volume/. /ravens_volume/

# (40) if it exists, attempt to load info from D3MINPUTDIR
printf "\n(40) Copy data to ravens_volume"
fab load_d3m_config_from_env

# (50) "Run web server.."
printf "\n(50) Run web server.."
setsid python manage.py runserver 0.0.0.0:8080
