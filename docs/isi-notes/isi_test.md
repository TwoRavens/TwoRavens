
## Run against the ISI docker image

## Get the ISI docker image:

 - login is the same as gitlab credentials

```
docker login registry.datadrivendiscovery.org
docker pull registry.datadrivendiscovery.org/j18_ta2eval/isi_ta2:stable
```

### Tag it for a local repo

```
docker tag registry.datadrivendiscovery.org/j18_ta2eval/isi_ta2:stable isi_ta2:stable
```

## Run it

```
docker run --rm -it  -p 45042:45042 --name=goisi -v /ravens_volume:/ravens_volume  isi_ta2:stable
```


### Bind the /ravens_volume directory

#### Make symlink

This allows the locally running TwoRavens to access ravens_volume as `/ravens_volume`
  - Find the fullpath to your directory ../TwoRavens/ravens_volume
  - `cd /; sudo ln -s (full path)/ravens_volume .`
    - example:
      - `cd /`
      - `sudo ln -s /Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume .`
  - `chmod -R +r /ravens_volume`

The new `/ravens_volume` "directory" needs to be cleared via Docker
  - Open the Docker application (Mac)
  - Go to "Preferences"
  - Select File Sharing
  - Click "+"
  - Add "" `/ravens_volume`


### Terminal 1:  Run the ISI docker image

- Run this command:

```
docker run --rm -ti -v /ravens_volume:/ravens_volume -v /tmp/dsbox-ta2:/tmp/dsbox-ta2 -p 45042:45042 --name isi_test isi_ta2:stable

docker run --rm -ti -v /ravens_volume:/ravens_volume -p 50051:50051 --name isi_test isi_ta2:stable

#docker run --rm --name isi_test  -v /ravens_volume:/ravens_volume -v #/tmp/dsbox-ta2:/tmp/dsbox-ta2 -p 45042:45042 #registry.datadrivendiscovery.org/ta2/isi_ta2:latest
```


### Terminal 2: Run TwoRavens

- cd into TwoRavens, then:
1. `workon 2ravens`
1. `export TA2_STATIC_TEST_MODE=False`
1. `export TA2_TEST_SERVER_URL=localhost:45052`
3. `fab run`

- Note: To switch back to canned responses:
1. stop this Terminal
2. `export TA2_STATIC_TEST_MODE=True`
3. `fab run`

### Stopping the ISI TA2:

- in a new Terminal
```
docker stop isi_test
```
  - This will take a few seconds

- clearing out ISI data
  - `rm -rf /tmp/dsbox-ta2`


### Old notes


#docker run --rm -it  -p 45042:45042 --name=goisi --entrypoint /bin/bash -v /ravens_volume:/ravens_volume isi_ta2:stable -c "ta2_search /ravens_volume/config_32_wikiqa.json"


docker run --rm -it -p45042:45042 --name=goisi -v /ravens_volume/config_32_wikiqa.json:/tmp/config.json -v /tmp/results:/tmp/results -v /ravens_volume:/ravens_volume -v /tmp/data:/tmp/data isi_ta2:stable

# --------------------------
# try with config in place
# --------------------------
docker run --rm -it -p45042:45042 --name=goisi \
-v /ravens_volume/config_32_wikiqa.json:/tmp/config.json \
-v /tmp/results:/tmp/results \
-v /tmp/data:/tmp/data \
-v /ravens_volume:/ravens_volume -d isi_ta2:stable

# --------------------------
# try with config copied to /tmp/config.json
# --------------------------
docker run --rm -it -p45042:45042 --name=goisi \
-v /tmp/config.json:/tmp/config.json \
-v /tmp/results:/tmp/results \
-v /tmp/data:/tmp/data \
-v /ravens_volume:/ravens_volume -d isi_ta2:stable



docker run -p45042:45042 --name=goisi \
-v /ravens_volume/config_32_wikiqa.json:/tmp/config.json \
-v /tmp/results:/tmp/results \
-v /ravens_volume:/ravens_volume -d isi_ta2:stable

# in running ISI container
docker exec -ti goisi /bin/bash
apt-get install net-tools
netstat -anv | egrep -w [.]45042.*LISTEN
