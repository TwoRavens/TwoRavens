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

# ensure the mongo db directory exists (and is not in root, because of sip)
MONGOD_DIR=$HOME/data/db
mkdir -p "$MONGOD_DIR"

#export FLASK_USE_PRODUCTION_MODE=yes
export DISPLAY_DATAMART_UI=True

if ! docker ps -a | grep -q raven-postgres; then
  ttab -G "echo -ne '\033]0;postgres\007'; cd $install_directory; workon 2ravens; docker kill raven-postgres; fab postgres_run; exit"
fi

# postgres must be ready before django is started
wait_for_port 5432

# rename tab; move into repo; set working env; kill django; kill webpack; run django; close tab;
ttab -G '
  echo -ne "\033]0;django\007";
  cd '$install_directory';
  workon 2ravens;
  lsof -ti:8080 | xargs kill;
  ps -ef | grep "webpack" | grep -v grep | awk '"'"'{print $2}'"'"' | xargs kill;
  export DISPLAY_DATAMART_UI='"$DISPLAY_DATAMART_UI"';
  fab run_with_ta2;
  exit'

ttab -G '
  echo -ne "\033]0;celery\007";
  cd '$install_directory';
  workon 2ravens;
  pkill -f celery;
  export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES;
  export AUTOML_FAST_DEBUG=yes;
  fab celery_run_with_ta2;
  exit'

#lsof -ti:8000 | xargs kill -9
# attempt graceful shutdown of flask to avoid leaking processes from the pool
ttab -G '
  echo -ne "\033]0;flask R\007";
  cd '$install_directory';
  workon 2ravens;
  [[ $(nc -z localhost 8000; echo $?) -eq 0 ]] && curl localhost:8000/shutdown;
  fab run_R;
  exit'

ttab -G "
  echo -ne '\033]0;mongod\007';
  workon 2ravens;
  mongo 127.0.0.1/admin --eval 'db.shutdownServer()';
  mongod --dbpath=$MONGOD_DIR;
  exit"

ttab -G '
  echo -ne "\033]0;redis\007";
  cd '$install_directory';
  workon 2ravens;
  redis-cli shutdown;
  redis-server;
  exit'

# wait for mongod to start
wait_for_port 27017
# reset the mongo database
mongo tworavens --eval "printjson(db.dropDatabase())"

# wait for the Django D3MConfiguration table to exist
wait_for_port 8080

if [[ $1 == "none" ]]; then
  fab choose_config:"$DATA_ID"
else
  ttab -G "
    echo -ne '\033]0;ta2 $1\007';
    cd $install_directory;
    workon 2ravens;
    docker kill ta2_server;
    fab run_ta2_$1_choose_config:$DATA_ID;
    exit"
fi

# deactivate 2ravens