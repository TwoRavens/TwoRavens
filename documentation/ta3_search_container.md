
## Test TA3 search with a docker image

#### Window 1

Get the main container and run it.  It will be in a "waiting state" with no web server running.

```
# get the main container from dockerhub
#
docker pull tworavens/ravens-main

# run it (no TA2 to connect to ...)
#
docker run --rm -ti --name=runraven -p 8080:8080 -v /ravens_volume:/ravens_volume tworavens/ravens-main:latest
```

#### Window 2

- Open a new Terminal
- Run ta3_search which starts up a web server at http://0.0.0.0:8080
- Note: neither rook nor TA2 is running so this fails...and ta3_search should shutdown

```
docker exec -ti runraven /bin/bash ta3_search /ravens_volume/config_196_autoMpg.json
```
