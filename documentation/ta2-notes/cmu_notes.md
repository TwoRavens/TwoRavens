## Run against the CMU docker image

Updated 9/17/2017.

## Get the CMU docker image:

 - login is the same as gitlab credentials

```
docker login registry.datadrivendiscovery.org
docker pull registry.datadrivendiscovery.org/sheath/cmu-ta2:live
```

## Run it with env variable

Within a Terminal:
1. `cd` into the top-level `TwoRavens` directory
1. Start the virtualenv:
    ```
    workon 2ravens
    ```
1. Show a list of datasets to run FL
    ```
    fab run_ta2_cmu_choose_config
    ```
1. Choose a dataset:
    ```
    fab run_ta2_cmu_with_config:[number of chosen dataset]
    ```

- *Note*: To stop the server:
    ```
    docker stop ta2_server
    ```

## Run everything else....

- Please follow the `ta3_run.md` instructions in this folder
