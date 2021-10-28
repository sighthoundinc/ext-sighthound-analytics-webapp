# Dockerfile to build a docker image for the reverse proxy.

FROM nginx:1.16.0-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
