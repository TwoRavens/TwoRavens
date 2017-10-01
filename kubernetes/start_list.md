
```
minikube start
eval $(minikube docker-env)
```


```
# from inside the TwoRavens directory

# build ravens
docker build -t tworavens:v1 .

# build rook
docker build -t rook:v1 . -f Dockerfile-rook

# build nginx
docker build -t nginx:v1 -f ./setup/nginx/Dockerfile-kube ./setup/nginx/
```
