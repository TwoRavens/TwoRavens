
- Notes working with the raven_pod3.yaml

```
# start it and add port forwarding
#
kubectl apply -f raven_pod3.yaml

# tworavens + rook port forwarding
kubectl port-forward raven1 8080:8080 8000:8000
#kubectl port-forward raven1 8080:8080
#kubectl port-forward raven1 80:80

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
kubectl delete -f raven_pod3.yaml
```

## copy files

```
# to local
kubectl cp raven1:/var/webapps/TwoRavens/README.md copied-README.md

# pod
kubectl cp myfile.txt raven1:/ravens_volume/myfile.txt
