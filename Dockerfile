# syntax=docker/dockerfile:1

# ── Stage 1: build the static bundle ──────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
# The image defaults to the bundled staff API, which exposes /api/auth/login.
ARG VITE_DATA_SOURCE=local
ENV VITE_DATA_SOURCE=$VITE_DATA_SOURCE
RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -q --spider http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
