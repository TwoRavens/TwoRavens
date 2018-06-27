
## Run against the FL docker image

## Get the FL docker image:

 - login is the same as gitlab credentials

```
docker login registry.datadrivendiscovery.org
docker pull registry.datadrivendiscovery.org/jkanter/mit-fl-ta2:stable
```

## Run it with env variable

Within a Terminal:
1. `cd` into the top-level `TwoRavens` directory
1. `workon 2ravens`
1. `run_featurelabs_choose_config`
1. `run_featurelabs_choose_config:[number of chosen dataset]`

## Run everything else....

For each command below, **FIRST**:
1. `cd` into the top-level `TwoRavens` directory
1. `workon 2ravens`

Commands:
1. Redis
    ```
    docker run --rm -p 6379:6379 -v /ravens_volume:/ravens_volume redis:4
    ```
    OR: 
    ```
    fab redis_run
    ```
1. Celery
    ```
    fab celery_run_with_ta2
    ```
1. Main app
    ```
    fab run_with_ta2
    ```
1. Rook
    ```
    fab run_rook
    ```
