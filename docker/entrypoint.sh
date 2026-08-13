#!/bin/sh
set -e

echo "[entrypoint] Проверка EnvironmentGuard..."
node ./scripts/assert-environment-guard.mjs

echo "[entrypoint] Применение миграций..."
npx prisma migrate deploy

echo "[entrypoint] Старт сервера..."
exec node server.js
