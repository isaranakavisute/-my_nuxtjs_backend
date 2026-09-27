# syntax=docker/dockerfile:1

# ---- Stage 1: build ----------------------------------------------------------
# Installs all deps (including dev) and compiles TypeScript to dist/.
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifests first so this layer is cached until dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
RUN npm run build

# ---- Stage 2: migrate --------------------------------------------------------
# Optional target for running migrations, since `npm run migrate` needs tsx and
# the .sql files, which the lean runtime image below deliberately omits.
#   docker build --target migrate -t app-migrate .
#   docker run --rm --env-file .env app-migrate
FROM build AS migrate
USER node
CMD ["npm", "run", "migrate"]

# ---- Stage 3: production dependencies ----------------------------------------
# A separate install with only production deps keeps the runtime image small.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 4: runtime --------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# node:alpine ships a non-root "node" user; run as it rather than root.
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

USER node

# PORT is read from the environment (defaults to 3001 in src/config/env.ts).
EXPOSE 3001

# Uses the app's own liveness probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
