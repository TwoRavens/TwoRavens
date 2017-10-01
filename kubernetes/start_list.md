

# Start minikube

```
minikube start
eval $(minikube docker-env)
```

# Build docker images

```
# from inside the TwoRavens directory

# build ravens
docker build -t tworavens:v2 .

# build rook
docker build -t rook:v2 . -f Dockerfile-rook

# build nginx
docker build -t nginx:v2 -f ./setup/nginx/Dockerfile-kube ./setup/nginx/
```
