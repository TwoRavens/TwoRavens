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
docker build -t tworavens/ravens-main:comfrey3 .
docker push tworavens/ravens-main:comfrey3

# Build rook service
docker build -t tworavens/ravens-r-service:comfrey3 -f Dockerfile-flask-r .
docker push tworavens/ravens-r-service:comfrey3;


# ----------------------------
# Build event Data images
# ----------------------------

# nginx
#
cd setup/nginx/;
docker build -f ./Dockerfile-eventdata -t tworavens/eventdata-ravens-nginx:sumac .;
docker push tworavens/eventdata-ravens-nginx:sumac;
cd ../../;

# ta3-main
#
docker build -f ./Dockerfile-eventdata -t tworavens/eventdata-ravens-main:sumac .;
docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD";
docker push tworavens/eventdata-ravens-main:sumac;
```


db.getCollectionNames().forEach(function(collname) {
   print(collname);
   db[collname].drop();
})
