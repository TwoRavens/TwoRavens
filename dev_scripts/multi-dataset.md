

## original command

```
docker run --rm --name ta2_server \
	-e D3MRUN=ta2ta3 \
	-e D3MINPUTDIR=/ravens_volume/test_data/DA_poverty_estimation \
	-e D3MPROBLEMPATH=/ravens_volume/test_data/DA_poverty_estimation/TRAIN/problem_TRAIN/problemDoc.json \
	-e D3MOUTPUTDIR=/ravens_volume/test_output/DA_poverty_estimation \
	-e D3MLOCALDIR=/ravens_volume/test_output/DA_poverty_estimation/local_dir \
	-e D3MSTATICDIR=/ravens_volume/test_output/DA_poverty_estimation/static_dir \
	-e D3MTIMEOUT=600 \
	-e D3MCPU=1 \
	-e D3MRAM=1 -p 45042:45042  \
	-e D3MPORT=45042 \
	-e D3MCONTEXT=TESTING \
	-e AM_ENV=DEBUG -v /ravens_volume/test_data/DA_poverty_estimation:/input -v /ravens_volume/test_output/DA_poverty_estimation:/output -v /ravens_volume:/ravens_volume registry.datadrivendiscovery.org/zshang/docker_images:ta2-new

```

## without problem path

-e D3MPROBLEMPATH=/ravens_volume/test_data/DA_poverty_estimation/TRAIN/problem_TRAIN/problemDoc.json \

```
docker run --rm --name ta2_server \
	-e D3MRUN=ta2ta3 \
	-e D3MINPUTDIR=/ravens_volume/test_data/DA_poverty_estimation \
	-e D3MOUTPUTDIR=/ravens_volume/test_output/DA_poverty_estimation \
	-e D3MLOCALDIR=/ravens_volume/test_output/DA_poverty_estimation/local_dir \
	-e D3MSTATICDIR=/ravens_volume/test_output/DA_poverty_estimation/static_dir \
	-e D3MTIMEOUT=600 \
	-e D3MCPU=1 \
	-e D3MRAM=1 -p 45042:45042  \
	-e D3MPORT=45042 \
	-e D3MCONTEXT=TESTING \
	-e AM_ENV=DEBUG -v /ravens_volume/test_data/DA_poverty_estimation:/input -v /ravens_volume/test_output/DA_poverty_estimation:/output -v /ravens_volume:/ravens_volume registry.datadrivendiscovery.org/zshang/docker_images:ta2-new
``` 

## one directory out

-e D3MPROBLEMPATH=/ravens_volume/test_data/DA_poverty_estimation/TRAIN/problem_TRAIN/problemDoc.json \

```
docker run --rm --name ta2_server \
	-e D3MRUN=ta2ta3 \
	-e D3MINPUTDIR=/ravens_volume/test_data \
	-e D3MOUTPUTDIR=/ravens_volume/test_output \
	-e D3MLOCALDIR=/ravens_volume/test_output/local_dir \
	-e D3MSTATICDIR=/ravens_volume/test_output/static_dir \
	-e D3MTIMEOUT=600 \
	-e D3MCPU=1 \
	-e D3MRAM=1 -p 45042:45042  \
	-e D3MPORT=45042 \
	-e D3MCONTEXT=TESTING \
	-e AM_ENV=DEBUG \
  -v /ravens_volume/test_data:/input \
  -v /ravens_volume/test_output:/output \
  -v /ravens_volume:/ravens_volume \
  registry.datadrivendiscovery.org/zshang/docker_images:ta2-new
```
