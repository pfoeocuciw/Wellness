#!/bin/sh
set -e

echo "➡️ Running Prisma migrate..."
npx prisma migrate deploy

echo "➡️ Seeding database..."
# seed безопасно перезапускать: у тебя deleteMany + вставка
npx prisma db seed

echo "➡️ Starting server..."
node src/server.js
