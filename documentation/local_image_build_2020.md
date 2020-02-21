# Build TwoRavens images locally

## Updates
```
# Data update
cd /ravens_volume/test_data/;
git pull


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

# Build main + rook-service
docker build -t tworavens/ravens-main:comfrey3 .
docker push tworavens/ravens-main:comfrey3

docker build -t tworavens/ravens-r-service:comfrey3 -f Dockerfile-flask-r .
docker push tworavens/ravens-r-service:comfrey3;
```
