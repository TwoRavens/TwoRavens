# Note: This only runs the Django app, not the flask services
FROM python:3.6.8
MAINTAINER TwoRavens http://2ra.vn/

LABEL organization="Two Ravens" \
      2ra.vn.version="0.8" \
      2ra.vn.release-date="2020-12-17" \
      description="Image for the Two Ravens python service which serves the UI."

# -------------------------------------
# Install sqlite + debugging tools
# -------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    apt-utils\
    iputils-ping \
    telnet \
    sqlite3 \
    vim \
    swig \
    build-essential

# -------------------------------------
# Install Redis client
# -------------------------------------
RUN cd /tmp && \
    wget http://download.redis.io/redis-stable.tar.gz && \
    tar xvzf redis-stable.tar.gz && \
    cd redis-stable && \
    make && \
    cp src/redis-cli /usr/local/bin/ && \
    chmod 755 /usr/local/bin/redis-cli

# -------------------------------------
# Pip update
# -------------------------------------
RUN pip install --upgrade pip

# -------------------------------------
# Set the workdir
# -------------------------------------
WORKDIR /var/webapps/TwoRavens

# -------------------------------------
# Copy over the requirements and run them
# -------------------------------------
COPY ./requirements/ ./requirements

RUN pip3 install --no-cache-dir -r requirements/prod.txt

# -------------------------------------
# Copy over the rest of the repository
# -------------------------------------
COPY . .

# -------------------------------------
# Set some environment variables
#   (This can be overridden in docker compose/kubernetes)
#
# - DJANGO_SETTINGS_MODULE: Django settings
# - R_DEV_SERVER_BASE - rook-service docker container
# - TA2_STATIC_TEST_MODE: True: use canned responses instead of a TA2 server
# - TA2_TEST_SERVER_URL - TA2 test server
# - CODE_REPOSITORY - repository where code will be copied
# - ALLOW_SOCIAL_AUTH - Allow login with python social auth--needs oauth2
#                       credentials on the deployment server
# -------------------------------------
ENV DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container2 \
    R_DEV_SERVER_BASE=http://rook-service:8000/ \
    TA2_STATIC_TEST_MODE=False \
    TA2_TEST_SERVER_URL=localhost:45042 \
    CODE_REPOSITORY=/var/webapps/TwoRavens \
    LC_ALL=C.UTF-8 \
    ALLOW_SOCIAL_AUTH=False

#    export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
#     AUTOML_FAST_DEBUG=yes

# -------------------------------------
# Create a volume for sharing between containers
# -------------------------------------
VOLUME /ravens_volume

# -------------------------------------
# Run setup scripts
#   - init_db - creates sqlite db for test run with
#
#   - create_django_superuser - Admin user created for testing
#
#   - create_test_user - Non-admin user created for testing
#
#   - load_docker_ui_config - sets JS variables for UI d3m_mode to true
#
#   - collect_static - django collect static files
#
#   - make_d3m_configs_from_files - makes test config files accessible via env variables
#                             (not used for eval)
#   - make_d3m_config - WARNING: for testing. Loads D3M info based on the test data
#
# -------------------------------------
#RUN fab init_db && \
#    fab create_django_superuser && \
#    fab create_test_user  && \
#    fab load_docker_ui_config && \
#    fab collect_static

#    fab make_d3m_configs_from_files && \

# -------------------------------------
# Expose port for web communication
# - web: 8080
# -------------------------------------
EXPOSE 8080

# -------------------------------------
# Copy the scripts: gce_start, d3m_start
# -------------------------------------
# COPY startup_script/ta3_search /usr/bin/ta3_search
# COPY startup_script/gce_start.sh /usr/bin/gce_start.sh
COPY startup_script/d3m_start.sh /usr/bin/d3m_start.sh
COPY startup_script/d3m_start_multiuser.sh /usr/bin/d3m_start_multiuser.sh
COPY startup_script/d3m_start_gates_01.sh /usr/bin/d3m_start_gates_01.sh

RUN chmod u+x /usr/bin/d3m_start.sh /usr/bin/d3m_start_multiuser.sh /usr/bin/d3m_start_gates_01.sh

# -------------------------------------
# Idle the container on startup so it
# can receive subsequent commands
# -------------------------------------
ENTRYPOINT tail -f /dev/null


#CMD /usr/bin/ta3_search

#RUN cd /var/webapps/TwoRavens && \
#    printf "\nStarting web server.." && \
#    python manage.py runserver 0.0.0.0:8080 > /dev/null 2> /tmp/ta3-main-log.txt &

# -------------------------------------
# Run the python server (django dev or gunicorn)
# -------------------------------------
#CMD echo 'Run this container using ta3_search.' && \
#    echo 'Example: docker run --rm -ti -p8080:8080 --name=gomain ravens-main:stable ta3_search [path to D3M config]'

#CMD echo 'Starting TwoRavens python server.' && \
#    cp -r ravens_volume/. /ravens_volume/ && \
#    python manage.py runserver 0.0.0.0:8080

# Run with gunicorn
#CMD gunicorn --workers=2 tworavensproject.wsgi_dev_container -b 0.0.0.0:8080
