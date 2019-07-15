#!/bin/bash

# -------------------------------------------------
# Script to TwoRavens development with a TA2
# From @Shoeboxam; 1/9/2019
#
# Usage: . dev_ubuntu_run.sh
# -------------------------------------------------

# On Ubuntu, I installed Redis with apt. It autostarts and requires `/etc/init.d/redis-server stop` to kill
# disable autostart with this: `sudo update-rc.d redis-server disable`
# The config file referenced in `fab redis_run` doesn't exist; I just start redis explicitly

cd ~/TwoRavens/
. `which virtualenvwrapper.sh`
workon 2ravens
: $(fab celery_restart)

fab clear_d3m_configs

# prevent package installation in R. This must be set within the 2ravens virtualenv
export ROOK_USE_PRODUCTION_MODE=yes

mongo tworavens --eval "printjson(db.dropDatabase())"

gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;django\007"; fuser -k 8080/tcp; fab run_with_ta2'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;ta2\007"; fab run_ta2_featurelabs_with_config:2'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;celery\007"; fab celery_run_with_ta2'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;rook\007"; fuser -k 8000/tcp; fab run_rook'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;mongod\007"; mongod --shutdown; mongod'
gnome-terminal --tab -- /bin/bash -c 'echo -ne "\033]0;redis\007"; redis-cli stop; redis-server'

cd ..
deactivate 2ravens
