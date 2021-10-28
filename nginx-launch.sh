#!/bin/bash
# Script to run the nginx docker image in a container. Uses port 3000.

set -e

NGINX_IMAGE=gcr.io/gcpbai/alpr-mobile-demo-nginx:latest
CONTAINER_NAME=alpr-mobile-demo-nginx

docker stop $CONTAINER_NAME || true
docker rm   $CONTAINER_NAME || true

docker run -it \
    --name $CONTAINER_NAME \
    -p 3000:80 \
    -e REACT_APP_ALPR_MOBILE_DEMO_SERVER_URL=localhost \
    -e REACT_APP_ALPR_MOBILE_DEMO_SERVER_PORT=4000 \
    $NGINX_IMAGE
