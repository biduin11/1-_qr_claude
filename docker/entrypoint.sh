#!/bin/sh
set -e

echo "[entrypoint] Проверка EnvironmentGuard..."
node ./scripts/assert-environment-guard.mjs

echo "[entrypoint] Применение миграций..."
npx prisma migrate deploy

echo "[entrypoint] Старт сервера..."
# sh (ash/dash) автоматически экспортирует HOSTNAME = имя хоста контейнера
# (в Docker это его container ID). Next.js standalone server.js читает
# `process.env.HOSTNAME || '0.0.0.0'` для адреса, на котором слушать — из-за
# автоэкспорта shell'а HOSTNAME оказывается непустым, сервер слушает на
# container-id вместо всех интерфейсов, и внешний healthcheck (Timeweb App
# Platform) не может достучаться до контейнера, хотя сам процесс жив (см.
# DEPLOYMENT.md, Iteration 9). Явно переопределяем перед стартом.
export HOSTNAME=0.0.0.0
exec node server.js
