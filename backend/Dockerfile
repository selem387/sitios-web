FROM denoland/deno:bin AS deno

FROM node:22-bookworm-slim
COPY --from=deno /deno /usr/local/bin/deno
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
COPY src ./src
COPY runner ./runner
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    DENO_DIR=/data/deno-cache \
    DENO_BIN=/usr/local/bin/deno
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/index.js"]
