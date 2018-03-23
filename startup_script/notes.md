
```
docker build -t ravens-main:stable .
docker run --rm -ti -p8080:8080 -v /ravens_volume:/ravens_volume --name=gomain ravens-main:stable ta3_search [path]
```

- switch CMD to ENTRYPOINT

- ref: https://docs.docker.com/engine/admin/multi-service_container/


### GCD

- run container

```
docker run -ti --rm --name raven1 -v /ravens_volume:/ravens_volume -p 8080:8080 tworavens/ravens-main:latest
```

- start web server

```
docker exec -ti raven1 /bin/bash gce_start.sh
```

#### OR override entry point and run it

```
docker run -ti --rm --name raven1 -v /ravens_volume:/ravens_volume -p 8080:8080 --entrypoint /usr/bin/gce_start.sh tworavens/ravens-main:latest```
```
