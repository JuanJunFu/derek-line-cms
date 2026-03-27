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

# 4. Run migrations
docker compose exec app npx prisma migrate deploy

echo "=== 部署完成 ==="
echo "網站：https://drweber.uk"
