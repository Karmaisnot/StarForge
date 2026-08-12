# syntax=docker/dockerfile:1.7

FROM node:22.23.1-alpine3.24 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@10.9.8 \
    && test "$(npm --version)" = "10.9.8" \
    && npm ci --include=dev --no-audit --no-fund

COPY . .
ARG VITE_DATA_SOURCE=remote
RUN test "${VITE_DATA_SOURCE}" = "remote" \
    && VITE_API_BASE_URL= VITE_DATA_SOURCE=remote npm run build

FROM nginx:1.30.4-alpine3.24 AS runtime

ARG BUILD_REVISION=unknown
LABEL org.opencontainers.image.title="StarForge Staff Workspace" \
      org.opencontainers.image.source="https://github.com/Karmaisnot/starforge_staff" \
      org.opencontainers.image.revision="${BUILD_REVISION}"

RUN rm -f /etc/nginx/conf.d/default.conf \
    && mkdir -p /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY --chmod=0555 docker-entrypoint.sh /usr/local/bin/starforge-entrypoint
COPY --from=build --chown=root:root /app/dist/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["starforge-entrypoint"]
