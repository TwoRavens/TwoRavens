2/1/2018

## Notes for downloading/tagging/uploading images

### Before submitting last master

- Run webpack

```
fab webpack_prod
fab run
```

- See if any new files are generated and check them in, if needed

### Check to make sure latest images built on dockerhub

**Note**: ravens-main is done at end of Travis test but other 2 images may take 10 minutes or so.  
  - Travis: https://travis-ci.org/TwoRavens/TwoRavens

- **ravens-main**
  - last update: https://hub.docker.com/r/tworavens/ravens-main/tags/
- **ravens-r-service**
  - gets kicked off after ravens-main completes
  - last update: https://hub.docker.com/r/tworavens/ravens-r-service/tags/
  - queue (if in process): https://hub.docker.com/r/tworavens/ravens-r-service/builds/
- **ravens-nginx**
  - gets kicked off after ravens-main completes
  - last update: https://hub.docker.com/r/tworavens/ravens-nginx/tags/
  - queue (if in process): https://hub.docker.com/r/tworavens/ravens-nginx/builds/


### Pull images from dockerhub

- reference: https://hub.docker.com/u/tworavens/

```
docker pull tworavens/ravens-main
docker pull tworavens/ravens-r-service
docker pull tworavens/ravens-nginx
```

### Tag those images

- remove old gitlab images

```
docker rmi registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-main:stable
docker rmi registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-r-service:stable
docker rmi registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-nginx:stable
```

- Retag images...

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
