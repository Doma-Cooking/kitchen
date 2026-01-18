# Base image
FROM node:22-slim AS base
WORKDIR /server

# Install all dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production dependencies only
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Production image
FROM node:22-slim AS production
WORKDIR /server

# Create non-root user
RUN groupadd --gid 1001 kitchen && \
    useradd --uid 1001 --gid kitchen --shell /bin/bash --create-home kitchen

# Copy production dependencies and built files
COPY --from=prod-deps /server/node_modules ./node_modules
COPY --from=build /server/dist ./dist
COPY package.json ./

# Set ownership
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

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev"]
