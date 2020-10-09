# script to reset individual services.
# 1. end the previous service if it exists, and the tab closes
# 2. start up a new service

install_directory=~/TwoRavens/

if [ "$1" == "postgres" ]; then
  ttab -G "
      echo -ne '\033]0;postgres\007';
      cd $install_directory;
      workon 2ravens;
      docker kill raven-postgres;
      fab postgres_run;
      exit"
fi

if [ "$1" == "django" ]; then
  # rename tab; move into repo; set working env; kill django; kill webpack; run django; close tab;
  DISPLAY_DATAMART_UI=false
  ttab -G '
    echo -ne "\033]0;django\007";
    cd '$install_directory';
    workon 2ravens;
    lsof -ti:8080 | xargs kill;
    ps -ef | grep "webpack" | grep -v grep | awk '"'"'{print $2}'"'"' | xargs kill;
    export DISPLAY_DATAMART_UI='"$DISPLAY_DATAMART_UI"';
    fab run_with_ta2;
    exit'
fi

if [ "$1" == "celery" ]; then
  ttab -G '
    echo -ne "\033]0;celery\007";
    cd '$install_directory';
    workon 2ravens;
    pkill -f celery;
    export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES;
    export AUTOML_FAST_DEBUG=yes;
    fab celery_run_with_ta2;
    exit'

  # by default, also restart django, so that workers are reloaded
  if [ "$2" != "standalone" ]; then
    bash startup_script/dev_mac_restart_mike.sh django
  fi
fi

if [ "$1" == "R" ]; then
  #lsof -ti:8000 | xargs kill -9
  # attempt graceful shutdown of flask to avoid leaking processes from the pool
  ttab -G '
    echo -ne "\033]0;flask R\007";
    cd '$install_directory';
    workon 2ravens;
    [[ $(nc -z localhost 8000; echo $?) -eq 0 ]] && curl localhost:8000/shutdown;
    fab run_R;
    exit'
fi

if [ "$1" == "mongo" ]; then

  # ensure the mongo db directory exists (and is not in root, because of sip)
  MONGOD_DIR=$HOME/data/db
  mkdir -p "$MONGOD_DIR"

  ttab -G "
    echo -ne '\033]0;mongod\007';
    workon 2ravens;
    mongo 127.0.0.1/admin --eval 'db.shutdownServer()';
    mongod --dbpath=$MONGOD_DIR;
    exit"
fi


if [ "$1" == "redis" ]; then
  ttab -G '
    echo -ne "\033]0;redis\007";
    cd '$install_directory';
    workon 2ravens;
    redis-cli shutdown;
    redis-server;
    exit'
fi

if [ "$1" == "ta2" ]; then
  DATA_ID=$3

  ttab -G "
    echo -ne '\033]0;ta2 $2\007';
    cd $install_directory;
    workon 2ravens;
    docker kill ta2_server;
    fab run_ta2_$2_choose_config:$DATA_ID;
    exit"
fi
