# Multi-stage build for a small, production-ready image

# 1) Install ALL dependencies (including dev for migrations)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Prefer npm ci when lockfile exists; fallback to npm install
RUN if [ -f package-lock.json ]; then \
            npm ci; \
        else \
            npm install; \
        fi

# 2) Build TypeScript using full dev deps
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
            npm ci; \
        else \
            npm install; \
        fi
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 3) Runtime image: copy built app + prod deps only
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    API_PREFIX=/api/v1

# Optional image metadata
ARG VERSION=0.0.0
LABEL org.opencontainers.image.title="picpay-api" \
    org.opencontainers.image.description="Monday.com Integration API (Node.js + TypeScript)" \
    org.opencontainers.image.version="$VERSION" \
    org.opencontainers.image.licenses="MIT"

# Copy production node_modules and build output, plus TS sources/config for cli commands
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/package*.json ./
COPY tsconfig.json ./
COPY ormconfig.js ormconfig.ts ./
COPY src ./src

RUN mkdir -p MondayFiles data/form-submissions data/pre-data && \
    chown -R node:node MondayFiles data

# Run as non-root user
USER node
EXPOSE 3000

CMD ["node", "dist/server.js"]
