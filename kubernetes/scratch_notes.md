(notes combined with those from @aaron)

- Start up

```
minikube start
#minikube start --vm-driver=xhyve
eval $(minikube docker-env)
```

```
docker login registry.datadrivendiscovery.org
```
- Run TwoRavens

```
docker build -t tworavens:v1 .
# deploy
#
kubectl run tworavens --image=tworavens:v1 --port=8080
# run service
#
kubectl expose deployment tworavens --type=NodePort
# show service
#

minikube service tworavens
```

- Run rook-service

```
docker build -t rook:v1 . -f Dockerfile-r-service
# deploy
#
kubectl run rook --image=rook:v1 --port=8000
# run service
#
kubectl expose deployment rook --type=NodePort
minikube service rook
# url to try: /custom/healthcheckapp
```

- list services

```
kubectl get deploy
kubectl get services
kubectl get pods --all-namespaces
```

- delete deployments/services

```
kubectl delete deploy tworavens
kubectl delete deploy rook
kubectl delete service tworavens
kubectl delete service rook
```

- Try to run from pod1.yml

```
kubectl create -f pod1.yml
kubectl get pod two-containers --output=yaml

kubectl delete pod two-containers

```

## UI

```
kubectl get services --namespace=kube-system kubernetes-dashboard
kubectl proxy
# go to http://localhost:8001/ui
```

## common

```
kubectl apply -f obj.yml
kubectl delete -f obj.yml

kubectl logs <pod-name>
kubectl exec -it <pod-name> -- bash
kubectl cp <pod-name>:/path/to/remote/file /path/to/local/file
kubectl cp /path/to/local/file <pod-name>:/path/to/remote/file
```

## get script into docker...

```
docker build -t end1 -f Dockerfile-test .

docker run --rm -p 8080:8080 --name=e1 end1

docker run --rm -p 8080:8080 --name=e1 --entrypoint /bin/bash  end1 -c "ta3_search"

docker run -i -t --rm end1 /bin/bash

docker run --rm -p 8080:8080 --name=e1 --entrypoint /bin/bash  end1 -c "ta3_search ravens_volume/config_r_30.json"

docker exec -ti e1 /bin/bash -c 'ta3_search'

```
