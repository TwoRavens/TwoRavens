
docker build -t ravens-main:exp -f Dockerfile-exp .

docker run --rm -ti -p 8080:8080 ravens-main:exp

docker run --rm -ti ravens-main:exp /bin/bash
