#!/bin/sh
set -e

echo "=== Waiting for PostgreSQL ==="
until pg_isready -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" 2>/dev/null; do
  sleep 1
done
echo "=== PostgreSQL is ready ==="

echo "=== Caching config ==="
php artisan config:cache 2>/dev/null || true

echo "=== Running migrations ==="
php artisan migrate --force

echo "=== Running seeders ==="
php artisan db:seed --force

echo "=== Starting gateway on 0.0.0.0:8110 ==="
exec php artisan serve --host=0.0.0.0 --port=8110
