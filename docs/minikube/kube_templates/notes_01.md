
- minikube install
  - https://gist.github.com/kevin-smets/b91a34cea662d0c523968472a81788f7

```
minikube start --vm-driver=xhyve
eval $(minikube docker-env)

# Build tworavens and rook images

```
docker build -t ravens-main:stable .
docker build -t ravens-r-service:stable -f Dockerfile-r-service .
# optional: ta2 test server
#docker build -t ravens-main:stable .

```

# Build nginx

```
cd setup/nginx
docker build -t ravens-nginx:stable -f Dockerfile .
```

# Run it

```
# get the pods running
#
kubectl apply -f kube.yml --validate=false

# delete the pods
#
kubectl delete -f kube.yml


# check status
kubectl get pods

# check events like ImagePullBackOff
kubectl describe pods ravens-ta3

# forward to local ports
#
sudo kubectl port-forward ravens-ta3 80:80
#kubectl port-forward ravens-ta3 8080:8080

# start ta3 search (optional, in separate container)
#
eval $(minikube docker-env)

kubectl exec -ti ravens-ta3 --container ta3-main -- ta3_search /ravens_volume/config_185_baseball.json

kubectl exec -ti ravens-ta3 --container ta3-main -- ta3_search /ravens_volume/config_38_sick.json


kubectl exec ravens-ta3 --container ta3-main -- /bin/bash ta3_search /ravens_volume/config_185_baseball.json

```

# Other commands

```
# Log into running pod
kubectl exec -it ravens-ta3 -c ta3-main -- /bin/bash
cp ravens_volume/. /ravens_volume/
# cp -r /var/webapps/TwoRavens/ravens_volume/. /ravens_volume

# describe containers in pod
kubectl describe pod/ravens-ta3

```



# Delete the pod

```
kubectl delete -f kube.yml
```

# logs

```
kubectl logs ravens-ta3 ravens-nginx
kubectl logs ravens-ta3 ta3-main
kubectl logs ravens-ta3 rook-service
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

# potential fix for minikube failure

```
rm -rf ~/.minikube/cache
```
