#!/bin/bash

# -------------------------------------------------
# Script to TwoRavens development with a TA2
# usage: . mac_start.sh
# -------------------------------------------------

# -----------------------------
# Update these paths -- at least (1)
# -----------------------------

# (1) - path to TwoRavens project
#
tworavens_path='~/Documents/github-rp/TwoRavens/'

# (2) - cmd to run Mongo
#
run_mongo='mongod --config /usr/local/etc/mongod.conf'

# (3) - invoke virtualenv wrapper (default may be ok on mac)
#
init_virtualenv='source /usr/local/bin/virtualenvwrapper.sh'

# -----------------------------
# Set the TA2 run command
# -----------------------------
# (4) - Adjust to run a specific TA2
#
run_ta2='fab run_ta2_featurelabs_with_config:2'

# -----------------------------
# Assemble init command: cd to TwoRavens and
#   run virtualenvwrapper
# -----------------------------
init_cmd="cd $tworavens_path;$init_virtualenv;workon 2ravens"
echo $init_cmd

# -----------------------------
# Commands to run
# -----------------------------
declare -a cmd_list=("fab run_with_ta2"
                     "fab redis_run"
                     "fab celery_run_with_ta2"
                     "fab run_rook"
                     "$run_ta2"
                     "$run_mongo"
                     "# dev shell 1"
                     )

# Loop through Commands
#
for raven_cmd in "${cmd_list[@]}"
do
  echo "$init_cmd;$raven_cmd"
  osascript -e 'tell application "Terminal" to do script "'"$init_cmd;$raven_cmd"'"'
done
