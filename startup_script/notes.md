docker build -t ravens-main:stable .
docker run --rm -ti -p8080:8080 --name=gomain ravens-main:stable /bin/bash
cd startup_script/
./run_main_server.sh
