FROM node:20-alpine as build

# Working directory
WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Set env variables
ARG ENVIRONMENT
ARG VERSION
ARG VUE_APP_ENVIRONMENT=${ENVIRONMENT}
ARG VUE_APP_VERSION=${VERSION}
ARG VUE_APP_QGIS_SERVER=https://gis.biip.lt
ARG VUE_APP_SMALSUOLIS_API_HOST=https://smalsuolis.lt/api
ARG VUE_APP_CDN_HOST=https://cdn.biip.lt
ARG VUE_APP_SENTRY_DSN
ARG NODE_ENV=production

# Build and cleanup
RUN yarn build

# Caddy stage
FROM caddy:2.6-alpine

# Expose port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -qO- http://localhost/ || exit 1

# Copy Caddyfile
COPY ./caddy/Caddyfile /etc/caddy/Caddyfile

# Copy built files from the build stage
COPY --from=build /app/dist /srv
