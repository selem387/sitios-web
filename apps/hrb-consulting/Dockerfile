# Construye una app exportada de Base44 (React + Vite) y la sirve con nginx.
# nginx reenvía /api, /ws-user-apps y las páginas de acceso al backend sitios-web.
# Copia este archivo y nginx.conf.template a la raíz del repo de la app.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY . .
ARG VITE_BASE44_APP_ID
# Vacío = mismo origen (nginx hace de proxy). No cambiar en producción.
ARG VITE_BASE44_APP_BASE_URL=""
ENV VITE_BASE44_APP_ID=$VITE_BASE44_APP_ID \
    VITE_BASE44_APP_BASE_URL=$VITE_BASE44_APP_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
# Valores por defecto; se sobreescriben con variables de entorno en Easypanel.
ENV API_UPSTREAM=http://sitios-web_api:3000 \
    TENANT_SLUG=cambiar \
    AUTH_PAGES_REGEX='^/(login|register|forgot-password|reset-password)/?$'
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
