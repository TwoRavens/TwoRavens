
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

## Run the ISI image in a separate window

```
docker run --rm -it  -p 45042:45042 --name=goisi -v /ravens_volume:/ravens_volume  isi_ta2:stable
```

## Run TwoRavens

- To make sure you're running shareable data from /ravens_volume:
    1. Delete the D3M config files from:
      - http://127.0.0.1:8080/admin/configurations/d3mconfiguration/
    2. Run `fab make_d3m_config_files`

The next step assumes separate Terminals for rook and the django app, e.g.

1. rook: `fab run_rook`
2. python/ui: `fab run_expect_ta2_external`
  - this is instead of `fab run`




### Bind the /ravens_volume directory

This may have already been done last year.

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

### debug run

```
# start the container with a bash shell
#
docker run -ti --rm -v /ravens_volume:/ravens_volume -v /tmp/dsbox-ta2:/tmp/dsbox-ta2 -p 45042:45042 --name goisi isi_ta2:stable /bin/bash


# comment out stderr line so output goes to Terminal
#
sed -i 's/sys.stderr = self.errorfile/#sys.stderr = self.errorfile/g' /dsbox/dsbox-ta2/python/dsbox/planner/controller.py

# Run the server
#
cd /dsbox/dsbox-ta2/python/server
python3 ta2-server.py

```

### Run ISI with env variable

```
# set the CONFIG_JSON_PATH variable
#
export CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json

# set the env on docker run
#
docker run -ti --rm -v /ravens_volume:/ravens_volume -e "CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json" -p 45042:45042 --name goisi isi_ta2:stable

```

### Run Brown TA2 with env variable

- Pull image

```
docker login registry.datadrivendiscovery.org
docker pull registry.gitlab.com/brownbigdata/idea/ta2:nightly
docker tag registry.gitlab.com/brownbigdata/idea/ta2:nightly brown_ta2:nightly
```

- Run image
```
# set the CONFIG_JSON_PATH variable
#
export CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json

# set the env on docker run
#
docker run -ti --rm -v /ravens_volume:/ravens_volume -e "CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json" -p 45042:45042 --name gobrown  brown_ta2:nightly
```

### Run TAMU TA2

- Pull image

```
docker login registry.datadrivendiscovery.org
docker pull dmartinez05/tamuta2:lastest
docker tag dmartinez05/tamuta2:lastest tamuta2:stable
```

- Run image

```
# set the CONFIG_JSON_PATH variable
#
export CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json

# set the env on docker run
#
docker run --rm -v /ravens_volume:/ravens_volume -p 45042:45042 --name tamu --entrypoint=ta2_search tamuta2:stable $CONFIG_JSON_PATH
```

### Run Featurelabs TA2

- Pull image

```
docker login registry.datadrivendiscovery.org
docker pull registry.datadrivendiscovery.org/mit-featurelabs/btb-dockerimage:stable
docker tag registry.datadrivendiscovery.org/mit-featurelabs/btb-dockerimage:stable featurelabs_ta2:stable
```

- Run image

```
# set the CONFIG_JSON_PATH variable
#
export CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json

# set the env on docker run
#
docker run --rm -v /ravens_volume:/ravens_volume -p 45042:45042 --name feature_labs --entrypoint=ta2_search featurelabs_ta2:stable $CONFIG_JSON_PATH

#docker run -ti --rm -v /ravens_volume:/ravens_volume -e "CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json" -p 45042:45042 --name feature_labs featurelabs_ta2:stable
```




#apt-get install vim
#vim /dsbox/dsbox-ta2/python/dsbox/planner/controller.py




### Old notes


```

docker run --rm -ti -v /ravens_volume:/ravens_volume -v /tmp/dsbox-ta2:/tmp/dsbox-ta2 -p 45042:45042 --name isi_test isi_ta2:stable /bin/bash



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

```
