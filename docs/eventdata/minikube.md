minikube start --vm-driver=xhyve
eval $(minikube docker-env)

kubectl apply -f eventdata-pod-01.yml --validate=false

kubectl describe pod/ravens-ta3

sudo kubectl port-forward ravens-ta3 80:80
