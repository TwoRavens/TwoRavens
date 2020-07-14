# Nginx note for TwoRavnes

Nginx is used when deploying on GCE and Data machines k8s clusters.

## Dockerfile

This creates a TwoRavens Dockerfile by:
1. Using nginx 1.19 which allows environment variables
2. Coping `nginx.conf.template` in to the Docker container
3. At runtime, this template:
  - Substitutes environment variables for values described in the Dockerfile
  - Is then copied to `/etc/nginx/nginx.conf`, becoming the default config
