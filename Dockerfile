# Note: This only runs the Django app, not the rook services
FROM ubuntu:16.04
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

LABEL organization="Two Ravens" \
      2ra.vn.version="0.0.1-beta" \
      2ra.vn.release-date="2017-09-20" \
      description="Image for the Two Ravens python service which serves the UI."

RUN apt-get update && \
    apt-get upgrade -y  && \
    apt-get install -y \
    python3-pip \
    sqlite3 \
    vim && \
    ln -sf /usr/bin/python3 /usr/bin/python

# Local directory with project source
#
ENV DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container2

# Set the R_DEV_SERVER_BASE to the rook-service docker container
#
ENV R_DEV_SERVER_BASE=http://rook-service:8000/custom/

# TA2_TEST_SERVER_URL is a bit problematic right now
#
ENV TA2_TEST_SERVER_URL=localhost:50051


RUN mkdir -p /var/webapps/TwoRavens

# Copy over the repository
COPY . /var/webapps/TwoRavens

WORKDIR /var/webapps/TwoRavens

# Install requirements
RUN pip3 install --no-cache-dir -r requirements/dev.txt && \
    fab init_db && \
    fab create_django_superuser && \
    fab load_docker_ui_config

EXPOSE 8080 50051

WORKDIR /var/webapps/TwoRavens

# Run dev server
CMD fab init_db && python manage.py runserver 0.0.0.0:8080


# -----------------------------------------
# -- Dev notes --
#
# build local:
# >docker build -t ravens1 .
#
# shell access:
# >docker run -ti  -p 8080:8080 ravens1 /usr/bin/bash
#
# run app
# >docker run -p 8080:8080 ravens1
# go to: http://0.0.0.0:8080
#
# - Potentially switch to a python 3.5 base image
# -----------------------------------------
