# Build TwoRavens images locally

## Updates
```
# Make sure your default datasets are available!
# The same datasets should be in:
# (1) fabfile.py
  - function: make_d3m_configs_from_files_multiuser_test_limited
  - variable: default_datatsets
    - e.g. `default_datatsets = ['56_sunspots_monthly']`
# (2) .dockerignore
# - make sure the test dataset is not ignored.
#   - e.g. `!ravens_volume/test_data/56_sunspots_monthly`
#

# Data update
cd /ravens_volume/test_data/;
git pull

# Next line changes based on your setp:
#
cd ~/Documents/github-rp/TwoRavens;
workon 2ravens;

# raven_solver update
cd tworaven_solver/
git checkout master
git pull
cd ..
# git submodule update --init --recursive

# common update
cd assets/common
git checkout develop
git pull
cd ../..;

# webpack
fab webpack_prod
fab run_with_ta2

# Build main TA3
docker build -t tworavens/ravens-main:yarrow-2021-0222b .
docker push tworavens/ravens-main:yarrow-2021-0222b

# Build rook service
docker build -t tworavens/ravens-r-service:yarrow-2021-0222b -f Dockerfile-flask-r .
docker push tworavens/ravens-r-service:yarrow-2021-0222b;

# Build nginx service
cd setup/nginx/;
docker build -f ./Dockerfile -t tworavens/ravens-nginx:yarrow-2021-0222b .
docker push tworavens/ravens-nginx:yarrow-2021-0222b
cd ../../;


# ----------------------------
# Summer: Tag & Push
# ----------------------------
# ravens-main
docker rmi registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-main:yarrow
docker tag tworavens/ravens-main:yarrow-2021-0222 registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-main:yarrow
docker push registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-main:yarrow

# ravens-r-service
docker rmi registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-r-service:yarrow
docker tag tworavens/ravens-r-service:yarrow-2021-0222 registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-r-service:yarrow
docker push registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-r-service:yarrow

# ravens-nginx
docker rmi registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-nginx:yarrow
docker tag tworavens/ravens-nginx:yarrow-2021-0222 registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-nginx:yarrow
docker push registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-nginx:yarrow


# ----------------------------
# Build event Data images
# ----------------------------

# nginx
#
cd setup/nginx/
docker build -f ./Dockerfile-eventdata -t tworavens/eventdata-ravens-nginx:yarrow-2021-0120 .
docker push tworavens/eventdata-ravens-nginx:yarrow-2021-0120;
cd ../../;

# ta3-main
#
docker build -f ./Dockerfile-eventdata -t tworavens/eventdata-ravens-main:yarrow-2021-0120 .;
docker push tworavens/eventdata-ravens-main:yarrow-2021-0120

#docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD";

```


db.getCollectionNames().forEach(function(collname) {
   print(collname);
   db[collname].drop();
})
