
## Build local container

```
docker build -t ravens-r-service:stable -f Dockerfile-r-service .
```

## Run containers

#### production "yes"

```
docker run -ti --rm --name rook -e ROOK_USE_PRODUCTION_MODE="yes" -p8000:8000 -v /ravens_volume:/ravens_volume ravens-r-service:stable
```

- log into running container

```
docker exec -ti rook /bin/bash
wget http://0.0.0.0:8000/custom/healthcheckapp
echo $ROOK_USE_PRODUCTION_MODE
```


#### production "no"

```
docker run -ti --rm --name rook -e ROOK_USE_PRODUCTION_MODE="no" -p8000:8000 -v /ravens_volume:/ravens_volume ravens-r-service:stable
```
