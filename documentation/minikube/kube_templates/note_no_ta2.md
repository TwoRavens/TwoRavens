## Run w/o a TA2

This is mainly to test ta3_search.


```
minikube start --vm-driver=xhyve
eval $(minikube docker-env)

# Build tworavens and rook images

```
docker build -t ravens-main:stable .
docker build -t ravens-r-service:stable -f Dockerfile-r-service .

# Build nginx
#
cd setup/nginx
docker build -t ravens-nginx:stable -f Dockerfile .
```

## Kubectl run

```
kubectl apply -f ta3_search_no_ta2.yml --validate=false
```

- forward port:

```
sudo kubectl port-forward ravens-ta3 80:80
```

## ta3 search

```
kubectl exec ravens-ta3 -c ta3-main -- ta3_search /ravens_volume/config_57_hypothyroid.json
```

- via python

```python
import subprocess

cmd = ['ta3_search' '/ravens_volume/config_57_hypothyroid.json']
cmd2 = ['kubectl exec ravens-ta3 -c ta3-main --', 'ta3_search /ravens_volume/config_57_hypothyroid.json']
with subprocess.Popen(cmd2, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, bufsize=1, universal_newlines=True) as p:
    for line in p.stdout:   print('OUT/ERR: %s' % line)
```
