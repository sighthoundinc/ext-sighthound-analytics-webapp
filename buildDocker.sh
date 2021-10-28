# Script to build the docker image for nginx.
# The docker image will be called alpr-mobile-demo-nginx, tag=latest.

MAIN_TAG="-t gcr.io/gcpbai/alpr-mobile-demo-nginx"
docker build  ${MAIN_TAG} --file Dockerfile .
