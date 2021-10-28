#!/bin/bash

set -e

EXT_PORT=5672
if [ -n "$1" ]; then
    EXT_PORT=$1
fi

EXT_PORT_MNG=15672
if [ -n "$2" ]; then
    EXT_PORT_MNG=$2
fi

EXT_PORT_WEBSTOMP=15674
if [ -n "$3" ]; then
    EXT_PORT_WEBSTOMP=$3
fi

DB_PATH=`pwd`/run/rabbitmq/db
if [ -n "$3" ]; then
    DB_PATH=$3
fi
mkdir -p "$DB_PATH"

RABBITMQ_IMAGE=rabbitmq:3.8-management
CONTAINER_NAME=rabbitmq-mobile-demo

docker stop $CONTAINER_NAME || true
docker rm   $CONTAINER_NAME || true

RABBITMQ_HOSTNAME="${RABBITMQ_HOSTNAME:-guest-rabbit}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"
RABBITMQ_PASS="${RABBITMQ_PASS:-guest}"

echo "launching '$RABBITMQ_HOSTNAME' for user '$RABBITMQ_USER' ..."

docker run -it \
    --name $CONTAINER_NAME \
    --hostname=$RABBITMQ_HOSTNAME \
    -p $EXT_PORT:5672 \
    -p $EXT_PORT_MNG:15672 \
    -p $EXT_PORT_WEBSTOMP:15674 \
    -v $DB_PATH:/var/lib/rabbitmq/mnesia/rabbit@$RABBITMQ_HOSTNAME \
    -v $PWD/rabbitmq-enabled_plugins:/etc/rabbitmq/enabled_plugins \
    -e RABBITMQ_DEFAULT_USER=$RABBITMQ_USER \
    -e RABBITMQ_DEFAULT_PASS=$RABBITMQ_PASS \
    $RABBITMQ_IMAGE
