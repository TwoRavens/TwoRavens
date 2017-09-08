# Note: This only runs the Django app, not the rook services
FROM ubuntu:16.04
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

RUN apt-get update && \
    apt-get upgrade  && \
    apt-get -y install vim && \
    apt-get -y install sqlite3 && \
    apt-get -y install python3-pip && \
    ln -sf /usr/bin/python3 /usr/bin/python

# Local directory with project source
#ENV DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container
ENV DJANGO_SETTINGS_MODULE=tworavensproject.settings.dev_container2

# Set the R_DEV_SERVER_BASE to the rook-service docker container
#
ENV R_DEV_SERVER_BASE=http://rook-service:8000/custom/

RUN mkdir -p /var/webapps/TwoRavens

# Copy over the repository
COPY . /var/webapps/TwoRavens

WORKDIR /var/webapps/TwoRavens

# Install requirements
RUN pip3 install --no-cache-dir -r requirements/dev.txt && \
    fab init_db && \
    fab create_django_superuser && \
    fab load_docker_config


EXPOSE 8080

WORKDIR /var/webapps/TwoRavens

# Run dev server
CMD fab init_db && python manage.py runserver 0.0.0.0:8080
# python manage.py runserver 0.0.0.0:8080
