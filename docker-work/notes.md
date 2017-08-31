Attempt to iteratively build an initial TwoRavens image containing:

- RApache - rook services
- Django

Notes:
  - Excessively big package with apache2-dev - to get the apxs package for mod_wsgi


## Docker 1

- Most of the apt-get packages (but not RApache)
  ```
  docker build -f docker-work/docker1 -t docker1 .
  ```

- run a temp container with this image:
    ```
    docker run -ti --rm --name=ok_ravens1 docker1:latest
    ```

## Docker 2

```
docker build -f docker-work/docker2 -t docker2 .
```


- Running the virtualenv:
    ```
    fab -f fab_mini.py virtualenv_start
    ```
