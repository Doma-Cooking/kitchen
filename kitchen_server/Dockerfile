# Base image (requires: docker build -t kitchen-base:latest -f Dockerfile.base .)
FROM kitchen-base:latest AS base
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code
WORKDIR /server

# Copy all local package sources
FROM base AS source
COPY kitchen_database/package.json kitchen_database/package-lock.json ./kitchen_database/
COPY kitchen_station/package.json kitchen_station/package-lock.json ./kitchen_station/
COPY kitchen_cookbook/package.json kitchen_cookbook/package-lock.json ./kitchen_cookbook/
COPY kitchen_server/package.json kitchen_server/package-lock.json ./kitchen_server/
COPY kitchen_database/tsconfig.json ./kitchen_database/
COPY kitchen_database/src ./kitchen_database/src
COPY kitchen_station/tsconfig.json ./kitchen_station/
COPY kitchen_station/src ./kitchen_station/src
COPY kitchen_cookbook/tsconfig.json ./kitchen_cookbook/
COPY kitchen_cookbook/scripts ./kitchen_cookbook/scripts
COPY kitchen_cookbook/src ./kitchen_cookbook/src

# Install all dependencies and build local packages
FROM source AS deps
RUN cd kitchen_database && npm ci && npm run build
RUN cd kitchen_station && npm ci && npm run build
RUN cd kitchen_cookbook && npm ci && npm run build
RUN cd kitchen_server && npm ci
RUN chown -R kitchen:kitchen /server
USER kitchen

# Build server TypeScript
FROM deps AS build
COPY kitchen_server/tsconfig.json ./kitchen_server/
COPY kitchen_server/src ./kitchen_server/src
RUN cd kitchen_server && npm run build

# Production dependencies only
FROM source AS prod-deps
RUN cd kitchen_database && npm ci --omit=dev && npm run build
RUN cd kitchen_station && npm ci --omit=dev && npm run build
RUN cd kitchen_cookbook && npm ci && npm run build && npm prune --omit=dev
RUN cd kitchen_server && npm ci --omit=dev

# Production image
FROM base AS production
WORKDIR /server
COPY --from=prod-deps /server/kitchen_database ./node_modules/kitchen_database
COPY --from=prod-deps /server/kitchen_station ./node_modules/kitchen_station
COPY --from=prod-deps /server/kitchen_cookbook ./node_modules/kitchen_cookbook
COPY --from=prod-deps /server/kitchen_server/node_modules ./node_modules
COPY --from=build /server/kitchen_server/dist ./dist
COPY kitchen_server/package.json ./                                                                                                                              
RUN chown -R kitchen:kitchen /server 
USER kitchen
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]

# Development image
FROM deps AS development
WORKDIR /server
ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "--prefix", "kitchen_server", "run", "dev"]
