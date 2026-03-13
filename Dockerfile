# Builder stage: compile TypeScript
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tsconfig.json ./

RUN npm run build

# Runtime stage: prod deps + compiled output only
FROM node:22-slim

RUN apt-get update && apt-get install -y git gosu zstd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create bin symlinks for kitchen CLI tools (npm doesn't self-link root package bins)
RUN chmod +x \
      dist/plugins/shared/tools/github.js \
      dist/plugins/shared/tools/slack.js \
      dist/plugins/shared/tools/linear.js \
      dist/plugins/shared/tools/notion.js \
      dist/plugins/shared/tools/kitchen.js \
      dist/plugins/domains/engineering/tools/typescript.js && \
    ln -sf /app/dist/plugins/shared/tools/github.js node_modules/.bin/kitchen-github && \
    ln -sf /app/dist/plugins/shared/tools/slack.js node_modules/.bin/kitchen-slack && \
    ln -sf /app/dist/plugins/shared/tools/linear.js node_modules/.bin/kitchen-linear && \
    ln -sf /app/dist/plugins/shared/tools/notion.js node_modules/.bin/kitchen-notion && \
    ln -sf /app/dist/plugins/shared/tools/kitchen.js node_modules/.bin/kitchen-tools && \
    ln -sf /app/dist/plugins/domains/engineering/tools/typescript.js node_modules/.bin/kitchen-typescript

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/index.js"]
