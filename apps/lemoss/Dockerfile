FROM python:3.12-alpine AS build
WORKDIR /src
COPY . .
RUN python3 build.py

FROM nginx:1.27-alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
