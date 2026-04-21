#!/bin/sh
set -e

echo "➡️ Running Prisma migrate..."
npx prisma migrate deploy

echo "➡️ Generating Prisma client..."
npx prisma generate

if [ "${SEED_DB_ON_START:-false}" = "true" ]; then
  echo "➡️ Seeding database..."
  npx prisma db seed
else
  echo "➡️ Skipping seed (set SEED_DB_ON_START=true to enable)"
fi

if [ "${RSS_IMPORT_ON_START:-true}" = "true" ]; then
  echo "➡️ Running RSS import on startup in background..."
  (
    /opt/venv/bin/python -m rss_importer.main --trigger startup --force --limit "${RSS_LIMIT_PER_FEED:-10}" \
      || echo "⚠️ Startup RSS import failed"
  ) &
else
  echo "➡️ Skipping RSS import on startup (set RSS_IMPORT_ON_START=true to enable)"
fi

if [ "${RSS_SCHEDULER_ENABLED:-true}" = "true" ]; then
  echo "➡️ Starting RSS scheduler in background..."
  (
    while true
    do
      /opt/venv/bin/python -m rss_importer.main --trigger scheduler --limit "${RSS_LIMIT_PER_FEED:-10}" \
        || echo "⚠️ Scheduled RSS import failed"

      sleep 3600
    done
  ) &
else
  echo "➡️ RSS scheduler disabled (set RSS_SCHEDULER_ENABLED=true to enable)"
fi

echo "➡️ Starting server..."
exec node src/server.js