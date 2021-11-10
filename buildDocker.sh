# Script to build the docker image for nginx.
# The docker image will be called alpr-mobile-demo-nginx, tag=latest.

MAIN_TAG="ext-sighthound-analytics-webapp"
docker build -t ${MAIN_TAG} --file Dockerfile .
docker tag ${MAIN_TAG}:latest us-central1-docker.pkg.dev/ext-edge-analytics/docker-public/${MAIN_TAG}:latest

echo "Push to public docker repo with:"
echo "docker push us-central1-docker.pkg.dev/ext-edge-analytics/docker-public/${MAIN_TAG}:latest"
