# Note: This only runs the Django app, not the rook services
FROM ubuntu:16.04
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

LABEL organization="Two Ravens" \
      2ra.vn.version="0.0.4-beta" \
      2ra.vn.release-date="2017-11-20" \
      description="Image for the Two Ravens python service which serves the UI."

# -------------------------------------
# Install some tools as well as python3
#  (future: start with a python image)
# -------------------------------------
RUN apt-get update && \
    apt-get install -y \
    iputils-ping \
    telnet \
    python3-pip \
    sqlite3 \
    vim && \
    ln -sf /usr/bin/python3 /usr/bin/python

# -------------------------------------
# Set some environment variables
#   (This can be overridden in docker compose/kubernetes)
#
# - DJANGO_SETTINGS_MODULE: Django settings
# - R_DEV_SERVER_BASE - rook-service docker container
# - TA2_TEST_SERVER_URL - TA2 test server
# - CODE_REPOSITORY - repository where code will be copied
# -------------------------------------
ENV DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container2 \
    R_DEV_SERVER_BASE=http://rook-service:8000/custom/ \
    TA2_TEST_SERVER_URL=localhost:50051 \
    CODE_REPOSITORY=/var/webapps/TwoRavens

# -------------------------------------
# Copy the repo over
#   - future: ignore the rook directory, be more selective
# -------------------------------------
RUN mkdir -p /var/webapps/TwoRavens && \
    mkdir -p /ravens_volume

# Copy over the repository
COPY . $CODE_REPOSITORY/

# -------------------------------------
# Create a volume for outside info
# -------------------------------------
VOLUME /ravens_volume



# -------------------------------------
# Set the working directory
# -------------------------------------
WORKDIR /var/webapps/TwoRavens

# -------------------------------------
# Pip install y'all and setup scripts
#   - init_db - creates sqlite db for test run with
#   - create_django_superuser - Admin user created for testing
#   - load_docker_ui_config - sets JS variables for UI d3m_mode is true
#   - collect_static - django collect static files
#   - make_d3m_config_files - makes test config files accessible via env variables
#                             (not used for eval)
#   - make_d3m_config - WARNING: for testing. Loads D3M info based on the test data
#   - load_d3m_config_from_env - loads TA2 style config specified in env var
#                                "CONFIG_JSON_PATH"
# -------------------------------------
RUN pip3 install --no-cache-dir -r requirements/prod.txt && \
    fab init_db && \
    fab create_django_superuser && \
    fab load_docker_ui_config && \
    fab collect_static && \
    fab make_d3m_config_files && \
    fab load_d3m_config_from_env

#   fab make_d3m_config && \

# -------------------------------------
# Expose port for web communication
# -------------------------------------
EXPOSE 8080

# -------------------------------------
# create the "ta3_search" command alias for
# the integration test.  This command is used against
# a running container
#
# docker exec -ti ta3-main /bin/bash -c 'ta3_search $CONFIG_JSON_PATH'
#
#x Xdocker run -i --entrypoint /bin/bash (tworavens image) -c 'ta3_search $CONFIG_JSON_PATH'
#
# - Valid configs load and the app runs
# - Invalid configs fail with error messages
# -------------------------------------
RUN echo '#!/bin/bash'  >> /usr/bin/ta3_search && \
    echo 'cd $CODE_REPOSITORY;'  >> /usr/bin/ta3_search && \
    echo 'python manage.py d3m_load_config "$@"'  >> /usr/bin/ta3_search && \
    chmod u+x /usr/bin/ta3_search && \
    echo '------- CREATE test_run command ---- (w/o extra build step)' && \
    echo '#!/bin/bash'  >> /usr/bin/test_run && \
    echo 'cd $CODE_REPOSITORY;'  >> /usr/bin/test_run && \
    echo 'python manage.py runserver 8080'  >> /usr/bin/test_run && \
    chmod u+x /usr/bin/test_run


# -------------------------------------
# Run the python server (django dev or gunicorn)
# -------------------------------------
CMD echo 'Starting tworavens python server.' && \
    fab load_d3m_config_from_env && \
    python manage.py runserver 0.0.0.0:8080
#CMD gunicorn --workers=2 tworavensproject.wsgi_dev_container -b 0.0.0.0:8080

# -----------------------------------------
# -- Dev notes --
#
# -----------------
# build local:
# -----------------
# >docker build -t ravens1 .
#
# -----------------
# run app
# -----------------
# >docker run -p 8080:8080 -p 50051:50051 ravens1
# go to: http://0.0.0.0:8080
#
# -----------------
# >run app with custom environment variable
# -----------------
# docker run -p 8080:8080 -p 50051:50051 -e TA2_TEST_SERVER_URL=rprasad2r.local:50051 ravens1
#
# -----------------
# > log into running app
# -----------------
# docker exec -it [container name] /bin/bash
#
# -----------------
# shell access:
# -----------------
# >docker run -ti --rm -p 8080:8080 -p 50051:50051 ravens1 /bin/bash
#
# - Potentially switch to a python 3.5 base image
# -----------------------------------------
