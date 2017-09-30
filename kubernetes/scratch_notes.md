(notes combined with those from @aaron)

- Start up

```
minikube start
eval $(minikube docker-env)
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
docker build -t rook:v1 . -f Dockerfile-rook
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

kubectl delete pod -f pod1.yml

```
