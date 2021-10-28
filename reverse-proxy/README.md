# UI Reverse Proxy
This directory builds a container which runs a reverse proxy. This routes all paths starting with `/api`
to the backend, and everything else goes to the frontend. For more information on reverse proxies, 
refer to the following links:

* [NGINX Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) - reverse proxy basics
* [Docker: React, Express & Reverse Proxy](https://medium.com/@frontendfoo/docker-react-express-reverse-proxy-15d7b37f8dc2) - an example of using a reverse proxy with a frontend and a backend

# Building the container
Run [buildDocker.sh](buildDocker.sh) to build the container.

# Running the container
Run using docker-compose in the root directory of this repository
