# Dockerfile to build a docker image for nginx.

# Build stage 1 - build the application.
FROM node:13 AS BUILD_IMAGE
WORKDIR /usr/src/app

COPY . .

ENV REACT_APP_API_HOST=/api

RUN npm install
RUN npm run build


# Build stage 2 - we just want nginx and our build results.
FROM nginx:1.19
WORKDIR /usr/src/app

COPY --from=BUILD_IMAGE /usr/src/app/build /usr/share/nginx/html/

EXPOSE 80/tcp 443/tcp
CMD ["nginx", "-g", "daemon off;"]
