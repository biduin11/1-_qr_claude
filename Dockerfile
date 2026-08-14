# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
# postinstall (`prisma generate`) needs the schema present before `npm ci` runs.
COPY prisma ./prisma
RUN npm ci

# ---- Development (used by docker-compose.dev.yml) ----
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Production build ----
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production-only dependencies (для `prisma migrate deploy` в runner-entrypoint) ----
# Отдельный `npm ci --omit=dev`, а не переиспользование node_modules из `deps`/`builder`
# (там ещё и devDependencies) и не точечный COPY отдельных .bin/@prisma-подпапок —
# так и легче (без typescript/eslint/vitest), и не ловит баг с symlink: `COPY --from`
# отдельного файла `node_modules/.bin/prisma` (symlink на `../prisma/build/index.js`)
# разыменовывает его в обычный файл, из-за чего CLI не находит соседний
# `prisma_schema_build_bg.wasm` по относительному пути — копирование node_modules
# целиком как каталога сохраняет symlink рабочим (обнаружено при проверке Iteration 7,
# не связано с PWA — см. Decision Log ARCHITECTURE.md §15).
FROM base AS prod-deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# ---- Production runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Timeweb Cloud App Platform запускает healthcheck как `docker exec <container>
# curl ...` изнутри контейнера, не внешним HTTP-запросом (подтверждено
# поддержкой Timeweb, Iteration 9) — без curl в образе деплой никогда не
# завершится, даже если сервер сам по себе полностью здоров и отвечает.
# node:24-alpine не содержит curl по умолчанию.
RUN apk add --no-cache curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY docker/entrypoint.sh ./entrypoint.sh

USER nextjs
EXPOSE 3000

# Порядок (см. DEPLOYMENT.md): проверка EnvironmentGuard -> миграции -> старт.
ENTRYPOINT ["sh", "./entrypoint.sh"]
