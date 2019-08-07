#!/bin/bash

# -------------------------------------------------
# Script to TwoRavens development with a TA2
# From @Shoeboxam; 1/9/2019
#
# Usage: . startup_script/dev_ubuntu_run.sh $1 $2
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

configCount=20

# On Ubuntu, I installed Redis with apt. It autostarts and requires `/etc/init.d/redis-server stop` to kill
# disable autostart with this: `sudo update-rc.d redis-server disable`
# The config file referenced in `fab redis_run` doesn't exist; I just start redis explicitly

cd ~/TwoRavens/
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
    DATA_ID=$((RANDOM % configCount))
  else
    DATA_ID=$2

    echo "Running with dataset:"
    echo $(fab run_ta2_brown_choose_config | grep "($DATA_ID)")
fi

: $(fab celery_restart)

fab clear_d3m_configs


# prevent package installation in R. This must be set within the 2ravens virtualenv
export FLASK_USE_PRODUCTION_MODE=yes
# limit the strategies in mlbox to ones that run immediately, for quick results debugging
export AUTOML_FAST_DEBUG=yes

gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;django\007"; fuser -k 8080/tcp; fab run_with_ta2'
gnome-terminal --tab -- /bin/bash -c "echo -ne '\033]0;ta2 $1\007'; docker kill ta2_server; fab run_ta2_$1_choose_config:$DATA_ID"
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;celery\007"; fab celery_run_with_ta2'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;flask R\007"; fuser -k 8000/tcp; fab run_R'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;mongod\007"; mongod --shutdown; mongod'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;redis\007"; redis-cli stop; redis-server'

sleep 2
mongo tworavens --eval "printjson(db.dropDatabase())"

# deactivate 2ravens