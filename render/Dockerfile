# Imagen oficial de Playwright: trae Chromium y sus dependencias del sistema (Node 22 incluido).
FROM mcr.microsoft.com/playwright:v1.49.1-noble
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi \
 && npm install -g --no-audit --no-fund lighthouse@12 impeccable@3
# Quitar fondo de fotos de producto (rembg + modelo isnet-general-use, descargado en la construcción).
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/rembg && /opt/rembg/bin/pip install --no-cache-dir "rembg[cpu]==2.0.67" \
 && U2NET_HOME=/opt/u2net /opt/rembg/bin/python -c "from rembg import new_session; new_session('isnet-general-use')"
ENV U2NET_HOME=/opt/u2net
COPY src ./src
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    DO_NOT_TRACK=1
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD curl -fsS http://127.0.0.1:8080/health || exit 1
CMD ["node", "src/index.js"]
