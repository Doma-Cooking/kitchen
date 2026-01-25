# Base image
FROM node:22-slim AS base
WORKDIR /dashboard

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
WORKDIR /dashboard

# Create non-root user
RUN groupadd --gid 1001 kitchen && \
    useradd --uid 1001 --gid kitchen --shell /bin/bash --create-home kitchen

# Copy production dependencies and built files
COPY --from=prod-deps /dashboard/node_modules ./node_modules
COPY --from=build /dashboard/dist ./dist
COPY package.json ./

# Set ownership
RUN chown -R kitchen:kitchen /dashboard

USER kitchen

ENV NODE_ENV=production
ENV DASHBOARD_PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]

# Development image
FROM deps AS development
WORKDIR /dashboard

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=development
ENV DASHBOARD_PORT=3001

EXPOSE 3001

CMD ["npm", "run", "dev"]
