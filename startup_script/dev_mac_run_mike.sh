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
#    berkeley
#    brown
#    cmu
#    featurelabs
#    isi
#    stanford
#    tamu
#
# and $2 is the dataset id. If 'r', random id is chosen up to configCount
# -------------------------------------------------

install_directory=~/TwoRavens/
config_count=20

cd $install_directory
. `which virtualenvwrapper.sh`
workon 2ravens

if [ -z "$1" ]
  then
    echo "Error: First argument must be one of:"
    echo "  berkeley, brown, cmu, featurelabs, isi, stanford, tamu"
  	return
fi

# if no dataset, then output list
if [ -z "$2" ]
  then
    echo "Error: Second argument must be one of:"
  	fab run_ta2_brown_choose_config
  	return
fi

# if r, then pick random
if [ $2 = 'r' ]
  then
    DATA_ID=$((RANDOM % config_count))
  else
    DATA_ID=$2

    echo "Running with dataset:"
    echo $(fab run_ta2_brown_choose_config | grep "($DATA_ID)")
fi

fab clear_d3m_configs

# prevent package installation in R. This must be set within the 2ravens virtualenv
export FLASK_USE_PRODUCTION_MODE=yes
# limit the strategies in mlbox to ones that run immediately, for quick results debugging
export AUTOML_FAST_DEBUG=yes

# rename tab; move into repo; set working env; kill django; kill webpack; run django; close tab;
ttab -G 'echo -ne "\033]0;django\007"; cd '$install_directory'; workon 2ravens; lsof -ti:8080 | xargs kill; ps -ef | grep webpack | awk "{print $2}" | xargs kill; fab run_with_ta2; exit'
ttab -G "echo -ne '\033]0;ta2 $1\007'; cd $install_directory; workon 2ravens; docker kill ta2_server; fab run_ta2_$1_choose_config:$DATA_ID; exit"
ttab -G 'echo -ne "\033]0;celery\007"; cd '$install_directory'; workon 2ravens; pkill -f celery; fab celery_run_with_ta2; exit'
ttab -G 'echo -ne "\033]0;flask R\007"; cd '$install_directory'; workon 2ravens; lsof -ti:8000 | xargs kill -9; fab run_R; exit'
ttab -G 'echo -ne "\033]0;mongod\007"; cd '$install_directory'; workon 2ravens; mongod --shutdown; mongod; exit'
ttab -G 'echo -ne "\033]0;redis\007"; cd '$install_directory'; workon 2ravens; redis-cli stop; redis-server; exit'

sleep 2
mongo tworavens --eval "printjson(db.dropDatabase())"

# deactivate 2ravens