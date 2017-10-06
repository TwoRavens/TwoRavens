

## Start up

```
minikube start --vm-driver=xhyve
#minikube start
eval $(minikube docker-env)
```

## Build docker images

```
# from inside the TwoRavens directory

# build ravens
docker build -t tworavens:v2 .

# build rook
docker build -t rook:v2 . -f Dockerfile-rook

# build nginx
docker build -t ravens-nginx:v2 -f ./setup/nginx/Dockerfile-kube ./setup/nginx/

# build TA2 test
docker build -t ta2-test:v2 -f Dockerfile-TA2-test .

```

## Notes working with the raven_pod5.yml

```
# start it and add port forwarding
#
kubectl apply -f raven_pod5.yml

# view pods
kubectl get pods --all-namespaces -o wide


# list secrets
kubectl get secrets

# tworavens + rook port forwarding
kubectl port-forward raven-pod1 8060:80
#kubectl port-forward raven-pod1 8060:80
#kubectl port-forward raven1 8080:8080 8000:8000
#kubectl port-forward raven1 8080:8080
#kubectl port-forward raven1 80:80

# logs
#
kubectl logs raven-pod1

# container specific
kubectl logs raven-pod1 tworavens

# terminal
#
kubectl exec -it raven-pod1 --container=tworavens bash
kubectl exec -it raven-pod1 --container=ta2-test bash

# date command
kubectl exec raven-pod1 date

# delete it
#
kubectl delete -f raven_pod4.yml

#
# describe pod (including containers)
kubectl describe pod/raven-pod1
```

## copy files

```
# to local
kubectl cp raven1:/var/webapps/TwoRavens/README.md copied-README.md

# pod
kubectl cp myfile.txt raven1:/ravens_volume/myfile.txt
