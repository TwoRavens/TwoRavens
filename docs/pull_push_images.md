12/19/2017

## Notes for downloading/tagging/uploading images

### Pull images from dockerhub

- reference: https://hub.docker.com/u/tworavens/

```
docker pull tworavens/ravens-main
docker pull tworavens/ravens-r-service
docker pull tworavens/ravens-nginx
```

### Tag those images

```
docker tag tworavens/ravens-main:latest registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-main:stable

docker tag tworavens/ravens-r-service:latest registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-r-service:stable

docker tag tworavens/ravens-nginx:latest registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-nginx:stable
```

### Upload those images

- login
```
docker login registry.datadrivendiscovery.org
```

- push

```
docker push registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-main:stable

docker push registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-r-service:stable

docker push registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-nginx:stable
```
