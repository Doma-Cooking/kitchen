FROM node:22-slim AS base
RUN groupadd --gid 1001 kitchen && \
    useradd --uid 1001 --gid kitchen --shell /bin/bash --create-home kitchen

# Configurable Flutter settings
ARG FLUTTER_CHANNEL=stable
ARG FLUTTER_HOME=/opt/flutter
ENV FLUTTER_HOME=${FLUTTER_HOME}
ENV PATH="${FLUTTER_HOME}/bin:${FLUTTER_HOME}/bin/cache/dart-sdk/bin:${PATH}"

# Install system dependencies (git, gh CLI, Flutter requirements)
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ca-certificates curl \
        unzip xz-utils zip \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

# Install Flutter SDK (latest from channel, CLI tools only)
RUN git clone -b ${FLUTTER_CHANNEL} --depth 1 https://github.com/flutter/flutter.git ${FLUTTER_HOME} \
    && git config --system --add safe.directory ${FLUTTER_HOME} \
    && flutter --disable-analytics \
    && dart --disable-analytics \
    && flutter config --no-analytics \
    && flutter precache --no-android --no-ios --no-web --no-macos --no-linux --no-windows --no-fuchsia \
    && chown -R kitchen:kitchen ${FLUTTER_HOME}

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci
RUN chown -R kitchen:kitchen /app
USER kitchen

# Build TypeScript
FROM deps AS build
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# Production dependencies only
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Production image
FROM base AS production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json .kitchen.yaml* ./
RUN chown -R kitchen:kitchen /app
USER kitchen
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]

# Development image
FROM deps AS development
WORKDIR /app
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]
