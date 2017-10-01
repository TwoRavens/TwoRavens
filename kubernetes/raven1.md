
- Notes working with the raven_pod.yaml

```
# start it and add port forwarding
#
kubectl apply -f raven_pod.yaml

# tworavens + rook port forwarding
kubectl port-forward raven1 8080:8080 8000:8000
#kubectl port-forward raven1 8080:8080

# logs
#
kubectl logs raven1

# terminal
#
kubectl exec -it raven1 bash

# date command
kubectl exec raven1 date

# delete it
#
kubectl delete -f raven_pod.yaml
```

## copy files

```
# to local
kubectl cp raven1:/var/webapps/TwoRavens/README.md copied-README.md

# pod
kubectl cp myfile.txt raven1:/ravens_volume/myfile.txt
