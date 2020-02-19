1/23/2020

# Notes for downloading/tagging/uploading images

## Before submitting last master

- Run webpack

```
fab webpack_prod
fab run
```

- See if any new files are generated and check them in, if needed.  These are generally:
  * /tworavens/assets/dist tworavens_app-XXX.js
  * /tworavens/assets/dist tworavens_styles-XXX.css
  * /tworavens/webpack-stats-prod.json

## Build Images for Dockerhub


Note: The most frequently built image is `tworavens/ravens-main`.  It is built/pushed at the end of successful Travis run.

**Note**: Travis: https://travis-ci.org/TwoRavens/TwoRavens

### tworavens/ravens-main

- Container containing the Django/mithril app as well as longer running solvers managed via celery
- It is built/pushed at the end of successful Travis run.
  - https://travis-ci.org/TwoRavens/TwoRavens
- Tags: https://hub.docker.com/r/tworavens/ravens-main/tags/
- Dockerfile location within TwoRavens repository: `/Dockerfile`
- Manual build:
  ```
  docker build -t tworavens/ravens-main:[tag name] -f Dockerfile .;
  docker push tworavens/ravens-main:[tag name];
  ```

### tworavens/ravens-r-service-base-py

- Infrequently updated that contains core R libraries and is used as a base image for the `ravens-r-service`
- Update this image when a new R library is used
- Tags: https://hub.docker.com/r/tworavens/r-service-base-py/tags
- Dockerfile location within TwoRavens repository: `/setup/r-base/Dockerfile-pybase`
- Manual build:
  ```
  # within the directory /setup/r-base
  docker build -t tworavens/r-service-base-py:[tag name] -f Dockerfile-pybase .
  docker push tworavens/r-service-base-py:[tag name];
  ```

### tworavens/ravens-r-service

- Service that runs flask-wrapped R services such as discover.
- Update this image when code within the `/R` directory is updated.
- Built on base image `tworavens/ravens-r-service`
- Tags: https://hub.docker.com/r/tworavens/ravens-r-service/tags/
- Dockerfile location within TwoRavens repository: `/Dockerfile-flask-r`
- Manual build:
  ```
  docker build -t tworavens/ravens-r-service:[tag name] -f Dockerfile-flask-r .
  docker push tworavens/ravens-r-service:[tag name];
  ```

### tworavens/ravens-nginx

- nginx web server that runs in front of the Django app
- nginx configuration serves static files separately from the app
- Updated infrequently.
- Tags: https://hub.docker.com/r/tworavens/ravens-nginx/tags/
- Dockerfile location within TwoRavens repository: `/setup/nginx/Dockerfile`
- Manual build:
  ```
  # within the directory /setup/nginx
  docker build -t tworavens/ravens-nginx:[tag name] -f Dockerfile .
  docker push tworavens/ravens-nginx:[tag name];
  ```

### Pull images from dockerhub

- reference: https://hub.docker.com/u/tworavens/

```
docker pull tworavens/ravens-main:[tag name]
docker pull tworavens/ravens-r-service:[tag name]
docker pull tworavens/ravens-nginx:[tag name]
```

### Tag images

- Tag images them as needed for kubernetes configurations used on GCE, DM, Azure, for specific feature sets, etc.


- Retag images...

```
docker tag tworavens/ravens-main:[tag name] registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-main:[tag name 2]
docker tag tworavens/ravens-r-service:[tag name] registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-r-service:[tag name 2]
docker tag tworavens/ravens-nginx:[tag name] registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-nginx:[tag name 2]
```

### Notes for DM upload

These are older notes for pushing to the gitlab registry `j18_ta3eval/tworavens`

- login
```
docker login registry.datadrivendiscovery.org
```

- push

```
# ravens-main
docker push registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-main:stable

# ravens-r-servie
docker push registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-r-service:stable

# ravens-nginx
docker push registry.datadrivendiscovery.org/j18_ta3eval/tworavens/ravens-nginx:stable
```
