

```
minikube start
eval $(minikube docker-env)

# Build tworavens and rook images

```
docker build -t ravens-main:stable .
docker build -t ravens-r-service:stable -f Dockerfile-r-service .
```

# Build nginx

```
cd setup/nginx
docker build -t ravens-nginx:stable -f Dockerfile .
```

# Run it

```
kubectl apply -f tworavens_test_ta2.yml --validate=false
kubectl port-forward ravens-eval 8080:8080
```

# Delete the pod

```
kubectl delete -f tworavens_test_ta2.yml
```


---
OLD from sept
---

# nginx, build image
#(TwoRavens/kubernetes)$ docker build -t nginx:v1 -f ./frontend/Dockerfile ./frontend

# deploy using the images
kubectl create -f deployment.yml
kubectl create -f service.yml
kubectl create -f frontend.yml
```

kubectl get deploy
kubectl get services

kubectl delete deploy frontend
kubectl delete deploy raven-app
kubectl delete service frontend
kubectl delete service raven-app
