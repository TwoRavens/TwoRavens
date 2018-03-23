#!/bin/bash

# Start the first process
/usr/bin/start_webserver -D
status=$?
if [ $status -ne 0 ]; then
  echo "Failed to start start_web_server: $status"
  exit $status
fi

# Naive check runs checks once a minute to see if either of the processes exited.
# This illustrates part of the heavy lifting you need to do if you want to run
# more than one service in a container. The container exits with an error
# if it detects that either of the processes has exited.
# Otherwise it loops forever, waking up every 60 seconds

while sleep 60; do
  ps aux |grep start_web_server |grep -q -v grep
  PROCESS_1_STATUS=$?

  # If the greps above find anything, they exit with 0 status
  # If they are not both 0, then something is wrong
  if [ $PROCESS_1_STATUS -ne 0 ]; then
    echo "One of the processes has already exited."
    exit -1
  fi
done
