2/1/2018

## Notes for downloading/tagging/uploading images

### Before submitting last master

- Run webpack

```
fab webpack_prod
fab run
```

- See if any new files are generated and check them in, if needed.  These are generally:
  * /tworavens/webpack-stats-prod.json
  * /tworavens/assets/dist tworavens_app-XXX.js
  * /tworavens/assets/dist tworavens_styles-XXX.css

### Check to make sure latest images built on dockerhub

**Note**: ravens-main is done at end of Travis test but other 2 images may take 10 minutes or so.  
  - Travis: https://travis-ci.org/TwoRavens/TwoRavens

- **ravens-main**
  - last update: https://hub.docker.com/r/tworavens/ravens-main/tags/
  - container with core frontend as well as python web service
- **ravens-r-service**
  - gets kicked off after `ravens-main` or `ravens-r-base` (below) completes
  - last update: https://hub.docker.com/r/tworavens/ravens-r-service/tags/
  - queue (if in process): https://hub.docker.com/r/tworavens/ravens-r-service/builds/
- **ravens-r-base**
  - This contains R + packages such as Zelig
  - This serves as the base for `ravens-r-service`.  
    - It is not rebuilt often.
    - It is not uploaded to gitlab or part of final deployment
  - Rebuild this manually if any packages are added to the Dockerfile for the image
      - Dockerfile: `setup/r-base-Dockerfile`
      - Page to trigger build (requires login):
        - https://hub.docker.com/r/tworavens/r-service-base/~/settings/automated-builds/
  - last update: https://hub.docker.com/r/tworavens/ravens-r-base/tags/
- **ravens-nginx**
  - gets kicked off after `ravens-main` completes
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
