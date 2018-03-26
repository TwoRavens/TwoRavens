docker file notes:

# build local r service-base
#
cd setup/r-base
docker build -t eventdata-r-service-base:latest -f Dockerfile-eventdata .

# build local r service
#
docker build -t eventdata-ravens-r-service:latest -f Dockerfile-eventdata-r-service .
