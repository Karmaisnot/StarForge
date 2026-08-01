# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npm run prisma:generate && npm run build

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

# Migrations are safe on every start. Seed only the first time a persistent
# volume is used, so normal restarts never overwrite real local changes.
CMD ["sh", "-c", "npx prisma migrate deploy && if [ ! -f /data/.seeded ]; then npx tsx prisma/seed.ts && touch /data/.seeded; fi && node dist/main.js"]
