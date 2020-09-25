# Testing variable passthrough

- reference: https://github.com/TwoRavens/TwoRavens/issues/925

## nginx check

```
# Run the nginx image
#
docker run --rm --name rnginx \
  -e NGINX_MAX_UPLOAD_SIZE="100M" \
  tworavens/ravens-nginx:comfrey-2020-0731

# Log into the image to see the "100M" pass-through
#
docker exec -ti rnginx /bin/bash
printenv | sort
nginx -T
```

## ravens-main check

```
# Run the ravens-main image
#
docker run --rm --name rmain \
  -e DATA_UPLOAD_MAX_MEMORY_SIZE="2097152" \
  -e TA2_D3M_SOLVER_ENABLED="False" \
  -e TA2_WRAPPED_SOLVERS="['tworavens']" \
  tworavens/ravens-main:comfrey-2020-0731

# Log into the image to see the "100M" pass-through
#
docker exec -ti rmain /bin/bash
printenv | sort
python manage.py dbshell
from django.conf import settings
settings.DATA_UPLOAD_MAX_MEMORY_SIZE
settings.FILE_UPLOAD_MAX_MEMORY_SIZE
```
