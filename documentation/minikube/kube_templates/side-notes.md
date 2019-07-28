## Commands to build and run ravens main container

### Build it

```
docker build -t ravens-main:exp -f Dockerfile .
```

### Run just ravens main with TA2 canned responses

```
docker run --rm -ti -p 8080:8080 --name=raven_running --env TA2_STATIC_TEST_MODE=True ravens-main:exp
```


###  Run ravens main and use TA2 test server based on mac's current IP which in this example is `192.168.1.155`

```
docker run --rm -ti -p 8080:8080 --name=raven_running --env TA2_TEST_SERVER_URL=192.168.1.155:45042 --env ravens-main:exp
```

###  Open a shell on the running container

```
docker exec -it raven_running /bin/bash
```

### ta3_search

```
docker exec -it raven_running /usr/bin/ta3_search /ravens_volume/config_185_baseball.json
```

---


R_DEV_SERVER_BASE=http://rook-service:8000/

docker run --rm -ti -p 8080:8080 --name=raven_running --env TA2_TEST_SERVER_URL=192.168.1.155:45042 --env ravens-main:exp
