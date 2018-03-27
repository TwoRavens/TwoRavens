minikube start --vm-driver=xhyve
eval $(minikube docker-env)

kubectl apply -f eventdata-pod-01.yml --validate=false

kubectl describe pod/ravens-ta3
