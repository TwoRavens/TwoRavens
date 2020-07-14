FROM nginx:1.19

MAINTAINER TwoRavens http://2ra.vn/
LABEL organization="Two Ravens" \
      2ra.vn.version="0.0.9-beta" \
      2ra.vn.release-date="2020-07-14" \
      description="Nginx for TwoRavens"

# -----------------------------------
# Use template that has placeholders for
# environment variables.
# -----------------------------------
COPY ./nginx.conf.template /etc/nginx/templates/

# -----------------------------------
# Set environment variables
#
# NGINX_MAX_UPLOAD_SIZE - Set the maximum upload size for files
# NGINX_SERVER_NAME - Set the server name.  Note ".2ravens.org" may be used for
#                     2ravens.org, cyan.2ravens.org, blue.2ravens.org, etc.
#
# -----------------------------------
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/ \
    NGINX_MAX_UPLOAD_SIZE=24M \
    NGINX_SERVER_NAME=.2ravens.org


# -----------------------------------
# When the container is run, it executes a function which reads template
# files in /etc/nginx/templates/*.template and outputs the result of
# executing envsubst to /etc/nginx/conf.d.
# ref: "Using environment variables in nginx configuration (new in 1.19)"
#   - https://hub.docker.com/_/nginx
# -----------------------------------
