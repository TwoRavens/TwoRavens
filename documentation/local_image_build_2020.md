# Build TwoRavens images locally

## Updates
```
# Data update
cd /ravens_volume/test_data/;
git pull

# Next line changes based on your setp:
#
cd ~/Documents/github-rp/TwoRavens;
workon 2ravens;

# raven_solver update
cd tworaven_solver/
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
docker build -t tworavens/ravens-main:comfrey-2020-0812 .
docker push tworavens/ravens-main:comfrey-2020-0812

# Build rook service
docker build -t tworavens/ravens-r-service:comfrey-2020-0812 -f Dockerfile-flask-r .
docker push tworavens/ravens-r-service:comfrey-2020-0812;

# Build nginx service
cd setup/nginx/;
docker build -f ./Dockerfile -t tworavens/ravens-nginx:comfrey-2020-0812 .
docker push tworavens/ravens-nginx:comfrey-2020-0812
cd ../../;


# ----------------------------
# Summer: Tag & Push
# ----------------------------
# ravens-main
docker rmi registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-main:yarrow
docker tag tworavens/ravens-main:comfrey-2020-0812 registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-main:yarrow
docker push registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-main:yarrow

# ravens-r-service
docker rmi registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-r-service:yarrow
docker tag tworavens/ravens-r-service:comfrey-2020-0812 registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-r-service:yarrow
docker push registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-r-service:yarrow

# ravens-nginx
docker rmi registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-nginx:yarrow
docker tag tworavens/ravens-nginx:comfrey-2020-0812 registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-nginx:yarrow
docker push registry.datadrivendiscovery.org/ta3-submissions/ta3-two-ravens/summer2020evaluation/ravens-nginx:yarrow


# ----------------------------
# Build event Data images
# ----------------------------

# nginx
#
cd setup/nginx/
docker build -f ./Dockerfile-eventdata -t tworavens/eventdata-ravens-nginx:yarrow-2020-0812 .
docker push tworavens/eventdata-ravens-nginx:yarrow-2020-0812;
cd ../../;

# ta3-main
#
docker build -f ./Dockerfile-eventdata -t tworavens/eventdata-ravens-main:yarrow-2020-0812 .;
docker push tworavens/eventdata-ravens-main:yarrow-2020-0812

#docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD";

```


db.getCollectionNames().forEach(function(collname) {
   print(collname);
   db[collname].drop();
})
