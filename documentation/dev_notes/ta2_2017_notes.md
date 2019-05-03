## Even older??

docker pull registry.datadrivendiscovery.org/j18_ta2eval/isi_ta2:stable


# set the CONFIG_JSON_PATH variable
#
export CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json

# set the env on docker run
#
docker run -ti --rm -v ~/ravens_volume:/ravens_volume -e "CONFIG_JSON_PATH=/ravens_volume/config_185_baseball.json" -p 45042:45042 --name goisi isi_ta2:stable
==============================


## Trying to run an ISI image with registry...

- older registry: https://gitlab.datadrivendiscovery.org/cTA2TA3/ISI_TwoRavens/container_registry
- desired API: `v2017.12.20`
  - registry history: https://gitlab.com/datadrivendiscovery/ta3ta2-api/blob/devel/HISTORY.md

- https://datadrivendiscovery.org/wiki/display/gov/Dry-Run+Evaluation+Plan

```
# ta2 search
#
docker run -i --entrypoint /bin/bash -v /ravens_volume:/ravens_volume registry.datadrivendiscovery.org/cta2ta3/isi_tworavens/ta2/isi_ta2:python3 -c 'ta2_search /ravens_volume/test_data/185_baseball/search_config.json'

docker run -i --entrypoint /bin/bash -v /ravens_volume:/ravens_volume registry.datadrivendiscovery.org/cta2ta3/isi_tworavens/ta2/isi_ta2:python3 -c 'ta2_search /ravens_volume/test_data/185_baseball/search_config.json'

docker run -i --entrypoint /bin/bash\
 -v /ravens_volume:/ravens_volume\
 -e "CONFIG_JSON_PATH=/ravens_volume/test_data/185_baseball/search_config.json"\
 registry.datadrivendiscovery.org/cta2ta3/isi_tworavens/ta2/isi_ta2:python3\
 -c 'ta2_search $CONFIG_JSON_PATH'

docker exec -ti ta3-main /bin/bash -c 'ta3_search $CONFIG_JSON_PATH'
-e "CONFIG_JSON_PATH=/ravens_volume/test_data/185_baseball/search_config.json"

docker run --rm -it -p 45042:45042 --name=goisi -e "CONFIG_JSON_PATH=/ravens_volume/test_data/185_baseball/search_config.json" -v /ravens_volume:/ravens_volume -v /tmp/dsbox-ta2:/tmp/dsbox-ta2 registry.datadrivendiscovery.org/cta2ta3/isi_tworavens/ta2/isi_ta2:python3 /bin/bash -c 'ta2_search $CONFIG_JSON_PATH'

# ta3_search
#
docker run -v /ravens_volume:/ravens_volume -i --entrypoint /bin/bash  registry.datadrivendiscovery.org/cta2ta3/isi_tworavens/ta2/isi_ta2:python3 -c 'ta3_search /ravens_volume/test_data/185_baseball/search_config.json'

```

---

docker run --rm --name ta2_server\
 -e D3MTIMEOUT=60\
 -e D3MINPUTDIR=/input\
 -e D3MOUTPUTDIR=/output\
 -e D3MRUN=search\
 -p 45042:45042\
 --memory 10g\
 -e D3MRAM=10Gi\
 -e D3MCPU=1\
 -v /ravens_volume/test_data/185_baseball:/input\
 -v /ravens_volume/test_output/185_baseball:/output\
 -v /ravens_volume:/ravens_volume \
 registry.datadrivendiscovery.org/kyao/ta2-isi/ta3ta2-image:latest

---

 docker run --rm --name ta2_server\
  -e D3MTIMEOUT=60\
  -e D3MINPUTDIR=/input\
  -e D3MOUTPUTDIR=/output\
  -e D3MRUN=search\
  -p 45042:45042\
  --memory 10g\
  -e D3MRAM=10Gi\
  -e D3MCPU=1\
  -v /ravens_volume/test_data/185_baseball:/input\
  -v /ravens_volume/test_output/185_baseball:/output\
  -v /ravens_volume:/ravens_volume \
 registry.datadrivendiscovery.org/cta2ta3/isi_tworavens/ta2/isi_ta2:python3
