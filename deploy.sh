#!/bin/bash
set -e

echo "=== DEREK LINE CMS 部署腳本 ==="

# 1. Pull latest code
git pull origin main

# 2. Build and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# 3. Wait for DB
echo "等待資料庫就緒..."
sleep 5

# 4. Sync DB schema (db push — 不需要 migration 檔案)
docker run --rm --network derek-line-cms_default \
  -v $(pwd)/prisma:/app/prisma \
  -e 'DATABASE_URL=postgresql://postgres:DerekLine2026!@derek-line-cms-db-1:5432/derek_line' \
  node:20-alpine sh -c "npm install -g prisma@6 --quiet 2>/dev/null && prisma db push --schema /app/prisma/schema.prisma --accept-data-loss"

echo "=== 部署完成 ==="
echo "網站：https://drweber.uk"
