# Imagen oficial de Playwright: trae Chromium y sus dependencias del sistema (Node 22 incluido).
FROM mcr.microsoft.com/playwright:v1.49.1-noble
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
COPY src ./src
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD curl -fsS http://127.0.0.1:8080/health || exit 1
CMD ["node", "src/index.js"]
