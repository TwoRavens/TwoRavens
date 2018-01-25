servers=$(ps -a | grep python | wc -l)
echo $servers
if [ $servers -eq 0 ]
then
    cp -r /var/webapps/TwoRavens/ravens_volume/. /ravens_volume/
    cd /var/webapps/TwoRavens
    echo "starting web server.."
    python manage.py runserver 0.0.0.0:8080 > /dev/null 2> /tmp/ta3-main-log.tx &
    echo "3 second pause..."
    sleep 3
fi
cd /var/webapps/TwoRavens
python manage.py ta3_search "$@"
