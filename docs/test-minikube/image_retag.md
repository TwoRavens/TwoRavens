
# Retag the pulled docker images for use in minikube

```
docker tag registry.datadrivendiscovery.org/tworavens/tworavens/nginx:latest ravens_nginx:latest 
docker tag registry.datadrivendiscovery.org/tworavens/tworavens:latest tworavens:latest 
docker tag registry.datadrivendiscovery.org/tworavens/tworavens/rook-service:latest rook:latest 
docker tag registry.datadrivendiscovery.org/ta2/isi_ta2:python3 isi_ta2:latest 
docker tag registry.datadrivendiscovery.org/eve/docker-images:latest cra_ta2:latest 
```