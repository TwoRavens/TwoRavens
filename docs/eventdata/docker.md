docker file notes:

# ------------------------------
# build local r service-base
# ------------------------------
cd setup/r-base
docker build -t tworavens/eventdata-r-service-base:latest -f Dockerfile-eventdata .

docker build -t eventdata-r-service-base:latest -f Dockerfile-slow-build .


docker run --rm -ti --name=go-ed -p 8000:8000 eventdata-r-service-base:latest /bin/bash

# ------------------------------
# build ravens r service
# ------------------------------
docker build -t tworavens/eventdata-ravens-r-service:latest -f Dockerfile-eventdata-r-service .

#docker run --rm --name=go-ed -p 8000:8000 eventdata-ravens-r-service:latest
#docker run --rm -ti --name=go-ed -p 8000:8000 eventdata-ravens-r-service:latest /bin/bash
#docker exec -ti go-ed /bin/bash

# ------------------------------
# build ravens main
# ------------------------------
docker build -t tworavens/eventdata-ravens-main:latest -f Dockerfile-eventdata .

docker run --rm -ti --name=go-ed-main -p 8080:8080 tworavens/eventdata-ravens-main:latest
