

```
minikube start --vm-driver=xhyve
eval $(minikube docker-env)

# Build tworavens and rook images

```
docker build -t ravens-main:stable .
docker build -t ravens-r-service:stable -f Dockerfile-r-service .
```

# Build nginx

```
cd setup/nginx
docker build -t ravens-nginx:stable -f Dockerfile-ngins .
```

# Run it

```
# get the pods running
#
kubectl apply -f tworavens_test_ta2.yml --validate=false

# forward to local ports
#
kubectl port-forward ravens-eval 8080:8080

# start ta3 search (optional, in separate container)
#
eval $(minikube docker-env)

kubectl exec ravens-eval --container ta3-main -- ta3_search /ravens_volume/config_185_baseball.json

```

# Other commands

```
# Log into running pod
kubectl exec -it ravens-eval -c ta3-main -- /bin/bash

# describe containers in pod
kubectl describe pod/ravens-eval

```



# Delete the pod

```
kubectl delete -f tworavens_test_ta2.yml
```

# logs

```
kubectl logs ravens-eval ravens-nginx
kubectl logs ravens-eval ta3-main
kubectl logs ravens-eval rook-service
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


## other notes

telnet rook-service 8000
