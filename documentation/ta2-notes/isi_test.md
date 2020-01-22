## Run against the ISI docker image

- Updated 1/21/2020.

## Get the ISI docker image:

 - login is the same as gitlab credentials

```
docker login registry.datadrivendiscovery.org
docker pull registry.datadrivendiscovery.org/kyao/ta3ta2/dsbox-2020-jan:latest
```

## Run it with env variable

Within a Terminal:
1. `cd` into the top-level `TwoRavens` directory
1. Start the virtualenv:
    ```
    workon 2ravens
    ```
1. make config files
    ```
    fab make_d3m_configs_from_files
    ```
1. Show a list of datasets to run with the TA2
    ```
    fab run_ta2_isi_choose_config
    ```
1. Choose a dataset:
    ```
    fab run_ta2_isi_choose_config:[number of chosen dataset]
    ```

- *Note*: To stop the server:
    ```
    docker stop ta2_server
    ```

## Run everything else....

- Please follow the `ta3_run.md` instructions in this folder
