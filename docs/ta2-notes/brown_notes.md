
Updated 7/17/2018.

## Get the Brown docker image:

 - reference: https://gitlab.datadrivendiscovery.org/zshang/Brown/blob/master/ta3_ta2_pair.yml
 - login is the same as gitlab credentials

```
docker login registry.datadrivendiscovery.org
docker pull registry.datadrivendiscovery.org/zshang/brown:ta2
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
    fab make_d3m_config_files
    ```
1. Show a list of datasets to run with the TA2
    ```
    fab run_ta2_brown_choose_config
    ```
1. Choose a dataset:
    ```
    fab run_ta2_brown_choose_config:[number of chosen dataset]
    ```

- *Note*: To stop the server:
    ```
    docker stop ta2_server
    ```

## Run everything else....

- Please follow the `ta3_run.md` instructions in this folder
