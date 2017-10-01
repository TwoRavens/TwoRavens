
- Notes working with the raven_pod4.yaml

```
# start it and add port forwarding
#
kubectl apply -f raven_pod5.yaml

# view pods
kubectl get pods --all-namespaces -o wide


# tworavens + rook port forwarding
kubectl port-forward raven-pod1 8060:80
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
kubectl delete -f raven_pod4.yaml

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
