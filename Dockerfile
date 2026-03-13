FROM node:22-slim

RUN apt-get update && apt-get install -y git gosu zstd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tsconfig.json ./
RUN npm run build

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/index.js"]
