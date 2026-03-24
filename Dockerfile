# Builder stage: compile TypeScript
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tsconfig.json ./

RUN npm run build && cp -r src/presentation/assets dist/presentation/assets

# Runtime stage: prod deps + compiled output only
FROM node:22-slim

RUN apt-get update && apt-get install -y git gosu zstd python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv \
    && chown -R node:node /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/index.js"]
