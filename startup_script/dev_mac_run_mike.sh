#!/bin/bash

# -------------------------------------------------
# Script for TwoRavens development with a TA2
# From @Shoeboxam
#
# SETUP:
#     1. install ttab with npm:
#       npm install ttab
#     2. I think this only works via iterm2. Someone test it otherwise and let me know
#
# USAGE: . startup_script/dev_mac_run_mike.sh $1 $2
# where $1 is one of:
#    none
#    berkeley
#    cmu
#    featurelabs
#    isi
#    stanford
#    tamu
#    nyu
#
# and $2 is the dataset id. If alphanumeric, attempts to select the matching dataset
# -------------------------------------------------

install_directory=~/TwoRavens/
config_count=20

cd $install_directory
. `which virtualenvwrapper.sh`
workon 2ravens

if [ -z "$1" ]
  then
    echo "Error: First argument must be one of:"
    echo "  berkeley, cmu, featurelabs, isi, stanford, tamu, nyu, none"
  	return
fi

# if no dataset, then output list
if [ -z "$2" ]
  then
    echo "Error: Second argument must be one of:"
  	fab choose_config
  	return
fi

# if alphanumeric, but not completely numeric
if [[ "$2" =~ ^[[:alnum:]_-]*$ ]] && [[ ! "$2" =~ ^[[:digit:]]+$ ]]; then
  MATCHES=$(fab choose_config | grep "^\([0-9]*\).*" | grep "$2")
  if [[ $MATCHES  == *$'\n'* ]]; then
    echo "Found multiple matches:"
    echo $MATCHES
    return
  fi

  DATA_ID=$(echo "$MATCHES" | awk '{print $1}' | tr -d '()')
else
  DATA_ID=$2
fi

echo "Running with dataset:"
echo $(fab choose_config | grep "($DATA_ID)")

# ensure the docker app is running
open -g -a Docker.app || exit
# Wait for the server to start up, if applicable.
i=0
while ! docker system info &>/dev/null; do
  (( i++ == 0 )) && printf %s '-- Waiting for Docker to finish starting up...' || printf '.'
  sleep 1
done
(( i )) && printf '\n'

wait_for_port() {
  # wait for shutdown
  sleep 1
  # wait for startup
  while ! nc -z localhost $1; do
    sleep 0.1
  done
}

#fab clear_d3m_configs

#export FLASK_USE_PRODUCTION_MODE=yes
export DISPLAY_DATAMART_UI=True

if ! docker ps -a | grep -q raven-postgres; then
  echo ">> postgres"
  bash startup_script/dev_mac_restart_mike.sh postgres

  # postgres must be ready before django is started
  wait_for_port 5432
fi

echo ">> celery"
bash startup_script/dev_mac_restart_mike.sh celery standalone

# restart celery first, so that workers will be updated before django loads
echo ">> django"
bash startup_script/dev_mac_restart_mike.sh django

echo ">> flask R"
bash startup_script/dev_mac_restart_mike.sh R

echo ">> mongo"
bash startup_script/dev_mac_restart_mike.sh mongo

echo ">> redis"
bash startup_script/dev_mac_restart_mike.sh redis

# wait for mongod to start
wait_for_port 27017
# reset the mongo database
mongo tworavens --eval "printjson(db.dropDatabase())"

# wait for the Django D3MConfiguration table to exist
wait_for_port 8080

if [[ $1 == "none" ]]; then
  docker kill ta2_server || true
  fab choose_config:"$DATA_ID"
else
  echo ">> ta2"
  bash startup_script/dev_mac_restart_mike.sh ta2 $1 $DATA_ID
fi

open -a 'google chrome' http://localhost:8080

# deactivate 2ravens