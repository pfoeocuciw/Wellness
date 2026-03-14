#!/bin/sh
set -e

echo "➡️ Running Prisma migrate..."
npx prisma migrate deploy

echo "➡️ Generating Prisma client..."
npx prisma generate

echo "➡️ Seeding database..."
npx prisma db seed

echo "➡️ Running RSS import on startup in background..."
(
  /opt/venv/bin/python -m rss_importer.main --trigger startup --force --limit "${RSS_LIMIT_PER_FEED:-10}" \
    || echo "⚠️ Startup RSS import failed"
) &

echo "➡️ Starting RSS scheduler in background..."
(
  while true
  do
    /opt/venv/bin/python -m rss_importer.main --trigger scheduler --limit "${RSS_LIMIT_PER_FEED:-10}" \
      || echo "⚠️ Scheduled RSS import failed"

    sleep 3600
  done
) &

echo "➡️ Starting server..."
exec node src/server.js