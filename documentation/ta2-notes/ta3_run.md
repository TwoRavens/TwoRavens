## If you need to update any dependencies

Go through the list of update commands in
  - `update_dependencies.md`

## Run the TA3 for an external TA2

These are the additional instructions, following those in:
  - `fl_notes.md`
  - `brown_notes.md`
  - `isi_test.md`


## TA3 instructions

For each command below, **FIRST**:

1. `cd` into the top-level `TwoRavens` directory
2. `workon 2ravens`

### Commands:

1. Redis
    ```
    fab redis_run
    ```
    OR:
    ```
    docker run --rm -p 6379:6379 -v /ravens_volume:/ravens_volume redis:4
    ```
2. Celery
    ```
    fab celery_run_with_ta2
    ```
3. Main app
    ```
    fab run_with_ta2
    ```
4. R applications
    ```
    fab run_flash
    ```
5. If Mongo is not up then:
    ```
    mongod --config /usr/local/etc/mongod.conf
    ```

## Open Browser

Open browser to <http://localhost:8080/>
