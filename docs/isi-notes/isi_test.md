
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

## Run ISI with env variable

- In a new Terminal:
  - **note:** Don't forget the line `export CONFIG_JSON_PATH...`

```
# set the CONFIG_JSON_PATH variable
#
export CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json

# set the env on docker run
#
docker run -ti --rm -v /ravens_volume:/ravens_volume -e "CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json" -p 45042:45042 --name goisi isi_ta2:stable
```

#### Troubleshoot ISI (or another TA2)

- For troubleshooting, while the ISI container is running, you can:

1. Open another Terminal
1. Log into the TA2: `docker exec -ti goisi /bin/bash`
1. Check the shared volume: `ls /ravens_volume`
    - e.g. is anything there? Does it match the local systems `ls /ravens_volume`?1
1. Check the env variable: `echo $CONFIG_JSON_PATH`
    - Should be the path set during `docker run ...`


## Run TwoRavens

To make sure you're running shareable data from /ravens_volume:

1. Clear the current D3M configs from the database:
    - `fab clear_d3m_configs`
1. Run `fab make_d3m_config_files`

The next step assumes separate Terminals for rook and the django app, e.g.

1. rook: `fab run_rook`
2. python/ui: `fab run_expect_ta2_external`
  - this is instead of `fab run`

### Check the TA2 connection

- Got to: http://127.0.0.1:8080/api/grpc-test-form
- Under the form textbox, click "send data"
  - The TA2 should send a response
  - Note: Several TA2s take well over 1-2 minutes to startup


## Preliminary Step: Bind the /ravens_volume directory

#### Make symlink

This allows the locally running TwoRavens to access ravens_volume as `/ravens_volume`
  - Find the fullpath to your directory ../TwoRavens/ravens_volume
  - `cd /; sudo ln -s (full path)/ravens_volume .`
    - example:
      - `cd /`
      - `sudo ln -s /Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume .`
  - `sudo chmod -R +r /ravens_volume`

The new `/ravens_volume` "directory" needs to be cleared via Docker (not necessary on Vagrant/Ubuntu setup):
  - Open the Docker application (Mac)
  - Go to "Preferences"
  - Select File Sharing
  - Click "+"
  - Add "" `/ravens_volume`



### Stopping the ISI TA2:

- In a new Terminal (this may take a few seconds):

    ```
    docker stop isi_test
    ```
  - This will take a few seconds



## Run Brown TA2 with env variable

- Pull image

```
docker login registry.datadrivendiscovery.org
docker pull registry.gitlab.com/brownbigdata/idea/ta2:nightly
docker tag registry.gitlab.com/brownbigdata/idea/ta2:nightly brown_ta2:nightly
```

- Run image
```
# set the JSON_CONFIG_PATH variable
#
export JSON_CONFIG_PATH=/ravens_volume/config_196_autoMpg.json

# set the env on docker run
#
docker run -ti --rm -v ~/ravens_volume:/ravens_volume -e "JSON_CONFIG_PATH=/ravens_volume/config_196_autoMpg.json" -p 45042:45042 --name gobrown  brown_ta2:nightly
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
docker run --rm -v ~/ravens_volume:/ravens_volume -p 45042:45042 --name tamu --entrypoint=ta2_search tamuta2:stable $CONFIG_JSON_PATH
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
docker run --rm -ti -v /ravens_volume:/ravens_volume -e "CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json" -p 45042:45042 --name feature_labs --entrypoint=ta2_grpc_server featurelabs_ta2:stable
```



### _Old notes_


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
