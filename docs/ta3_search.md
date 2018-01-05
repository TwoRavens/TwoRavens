# Notes on TA3 search

## Run the ta3_search listener

1. fab method (dev)
    ```
    # cd into the top level of the repository
    #cd ~/TwoRavens

    # invoke virtualenv
    workon 2ravens

    # add a listener to the db (may be there already)
    fab ta3_listener_add  

    # run a local flask server that shows messages sent from TwoRavens
    #   This runs on port 8001
    #
    fab ta3_listener_run
    ```
1. command method (dev)
    ```
    # cd into the top level of the repository
    #cd ~/TwoRavens

    # invoke virtualenv
    workon 2ravens

    # The TA3 search command:
    #   (1) loads a config
    #   (2) run2 a local flask server that shows messages sent from TwoRavens
    #
    python manage ta3_search [config file path]

    # example
    python manage ta3_search /ravens_volume/config_185_baseball.json
    ```
1. Against a running container (docker)
    ```
    docker exec -it tworavens_tworavens_1 ta3_search /ravens_volume/config_185_baseball.json
    ```
1. Log into a running container (docker) and then run the command
    ```
    docker exec -it tworavens_tworavens_1 /bin/bash
    # continue with (1) or (2) w/o virtualenv.
    #
    # example:
    #
    fab ta3_listener_add
    fab ta3_listener_run
    ```

## Send messages

1. Via swagger
  - go to: http://127.0.0.1:8080/static/pkgs/swagger-ui/dist/index.html?url=/api/v1/swagger.yml
  - scroll down to 'ta3_search'

---

## kube notes

- this is working...
  - kubectl exec -it ravens-eval -c ta3-main -- /usr/bin/ta3_search /ravens_volume/config_185_baseball.json

- working properly with *bash*
  - kubectl exec ravens-eval --container ta3-main -- bash ta3_search /ravens_volume/config_185_baseball.json

- ...but not without (as per specs)
  - kubectl exec -it ravens-eval -c ta3-main -- ta3_search /ravens_volume/config_185_baseball.json
