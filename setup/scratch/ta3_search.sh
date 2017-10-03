#!/bin/sh
echo '------------------------';
echo '-- TA3 Search command --';
echo '------------------------';

for i; do
    echo $i
 done
#echo 'command: ';
#echo $@;
echo '----';
if [ "$1" != "" ]; then
  python manage.py load_config $1
else
  echo 'Please specify a path to a D3M config file.\n'
fi
