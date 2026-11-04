#!/bin/sh

set -e

PORT="${PORT:-80}"
export APP_URL="${APP_URL:-${RENDER_EXTERNAL_URL:-http://localhost}}"

sed -ri "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf

mkdir -p \
    storage/app/private \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

php artisan storage:link >/dev/null 2>&1 || true

php artisan config:cache
php artisan view:cache
php artisan event:cache

apache2-foreground &
apache_pid=$!

attempt=0
until php artisan migrate --force; do
    attempt=$((attempt + 1))

    if [ "$attempt" -ge 10 ]; then
        echo "Database migrations failed after ${attempt} attempts." >&2
        exit 1
    fi

    echo "Migration attempt ${attempt} failed; retrying in 6 seconds..." >&2
    sleep 6
done

if [ "${SEED_DATABASE:-false}" = "true" ]; then
    php artisan db:seed --force
fi

if [ -f database/data/ict-related-equipment.xlsx ]; then
    php artisan inventory:import database/data/ict-related-equipment.xlsx \
        || echo "Inventory import failed; continuing." >&2
fi

if [ -n "${ADMIN_PASSWORD:-}" ]; then
    php artisan tinker --execute="\App\Models\User::query()->where('email', 'admin@ustp.edu.ph')->update(['password' => bcrypt(getenv('ADMIN_PASSWORD'))]);"
fi

wait "$apache_pid"
