
```
docker build -t ravens-main:stable .
docker run --rm -ti -p8080:8080 -v /ravens_volume:/ravens_volume --name=gomain ravens-main:stable ta3_search [path]
```

- switch CMD to ENTRYPOINT

- ref: https://docs.docker.com/engine/admin/multi-service_container/
