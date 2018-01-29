
```
docker build -t ravens-main:stable .
docker run --rm -ti -p8080:8080 -v /ravens_volume:/ravens_volume --name=gomain ravens-main:stable ta3_search [path]
```

- run on minikube
- execute ta3 search from kubectl
- test ta3_search
- push k8s
- push images
