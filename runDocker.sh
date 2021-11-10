#!/bin/bash
# Script to run the nginx docker image in a container. Uses port 3000.

set -e

CONTAINER_NAME=ext-sighthound-analytics-webapp
set +e
docker image inspect ${CONTAINER_NAME} > /dev/null 2>&1
rc=$?
set -e
if [ $rc -eq 0 ]; then
	echo "Using locally built container ${CONTAINER_NAME}"
	CONTAINER_IMAGE=${CONTAINER_NAME}
else
	CONTAINER_IMAGE="us-central1-docker.pkg.dev/ext-edge-analytics/docker-public/${CONTAINER_NAME}:latest"
	echo "Pulling container from  ${CONTAINER_IMAGE}"
	docker pull ${CONTAINER_IMAGE}
fi

docker stop $CONTAINER_NAME || true
docker rm   $CONTAINER_NAME || true

docker run -it \
    --name $CONTAINER_NAME \
    -p 3000:80 \
    ${CONTAINER_IMAGE}
