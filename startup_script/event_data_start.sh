#!/bin/bash

# --------------------------------------------------------------
# The database will be MySQL, so need to rerun these initial steps
# (this will go away as app db stabilizes)
# --------------------------------------------------------------
cd /var/webapps/TwoRavens

# Create new db
#
fab init_db

# Make superuser and test user
#
fab create_django_superuser
fab create_test_user

# Load the event data config
#
fab load_eventdata_prod

# collect static files
#
fab collect_static


# -------------------------------
# Start-up server
# -------------------------------
cd /var/webapps/TwoRavens

# (30) Copy test data to ravens_volume
printf "\n(30) Copy data to ravens_volume"
cp -r /var/webapps/TwoRavens/ravens_volume/. /ravens_volume/

# (50) "Run web server.."
printf "\n(50) Run web server.."
setsid python manage.py runserver 0.0.0.0:8080
