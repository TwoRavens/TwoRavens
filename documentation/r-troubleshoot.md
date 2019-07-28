
## Build local container

```
docker build -t ravens-r-service:stable -f Dockerfile-r-service .
#
# OR pull from gitlab
#
docker login registry.datadrivendiscovery.org
docker pull registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-r-service:stable
#
# OR pull from dockerhub
#
docker pull tworavens/ravens-r-service
```

## Run containers

#### production "yes"

```
docker run -ti --rm --name rook -e FLASK_USE_PRODUCTION_MODE="yes" -p8000:8000 -v /ravens_volume:/ravens_volume ravens-r-service:stable
```

- start container

```
docker run -ti --rm --name rook -e FLASK_USE_PRODUCTION_MODE="yes" -p8000:8000 registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-r-service:stable
```

- log into running container

```
docker exec -ti rook /bin/bash
wget http://0.0.0.0:8000/healthCheck.app
echo $FLASK_USE_PRODUCTION_MODE
```


#### production "no"

```
docker run -ti --rm --name rook -e FLASK_USE_PRODUCTION_MODE="no" -p8000:8000 -v /ravens_volume:/ravens_volume ravens-r-service:stable
```
