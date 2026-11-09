# WBIMIS — Namecheap Stellar (cPanel) Deployment

Checklist for deploying the Laravel 13 + Inertia/React app to Namecheap Stellar
shared hosting.

## Prerequisites (confirm before purchasing)

- [ ] PHP **8.3 or 8.4** selectable (Stellar supports 8.0–8.5).
- [ ] Required PHP extensions enabled in cPanel → *Select PHP Version*:
      `pdo_mysql`, `mbstring`, `openssl`, `gd`, `fileinfo`, `gmp` (built-in),
      and optionally `sodium` (web push).
- [ ] A MySQL/MariaDB database + user created in cPanel → *MySQL® Databases*.
- [ ] A Brevo account with a **verified sender email/domain** (required for the
      registration OTP and password-reset emails to actually send).

## 1. Clone the repository outside the web root

The main domain's document root is fixed at `public_html`, so keep the Laravel
application itself outside that directory:

```bash
cd "$HOME"
git clone https://github.com/05kleinthenewbie/wbimis-ustp-balubal.git wbimis
```

Do not put `.env`, `vendor/`, `storage/`, or the rest of the application inside
`public_html`.

## 2. Install PHP dependencies on the server

The cPanel Terminal has PHP 8.4 but may not have Composer on its PATH. If
`composer --version` is unavailable, install a user-local Composer PHAR:

```bash
cd "$HOME"
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --filename=composer.phar
php -r "unlink('composer-setup.php');"
cd "$HOME/wbimis"
php "$HOME/composer.phar" install --no-dev --optimize-autoloader
```

## 3. Build the frontend locally

The server Terminal does not have Node/npm, so run this on your computer in the
repository and upload the resulting `public/build/` directory:

```bash
npm ci
npm run build
```

Upload `public/build/` into both `$HOME/wbimis/public/build/` (for Laravel's
Vite manifest lookup) and `$HOME/public_html/build/` (for browsers to download
the assets).

## 4. Populate `public_html`

Copy the **contents** of `$HOME/wbimis/public/` into `$HOME/public_html/`
(including `.htaccess` and `index.php`). Edit `$HOME/public_html/index.php` so
its three application paths point to the sibling `wbimis` directory:

```php
__DIR__.'/../wbimis/storage/framework/maintenance.php'
__DIR__.'/../wbimis/vendor/autoload.php'
__DIR__.'/../wbimis/bootstrap/app.php'
```

Because the main domain's document root cannot be changed, this keeps private
Laravel files outside the web root while serving only `public/` contents.

## 5. Configure `.env`

Create `$HOME/wbimis/.env` (do not place it in `public_html`) and set:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true      # only after SSL is enabled
QUEUE_CONNECTION=database
CACHE_STORE=database
BREVO_API_KEY=...               # auth OTP / password reset (HTTP API)
BREVO_SENDER_EMAIL=...
MAIL_MAILER=smtp                # queued module emails (Brevo SMTP)
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_SCHEME=tls
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=...
VAPID_PUBLIC_KEY=...            # optional web push
VAPID_PRIVATE_KEY=...
JWT_SECRET=...                  # mobile API
```

## 6. Upload `.user.ini`

Place `deploy/namecheap/.user.ini` in `$HOME/public_html/` (same directory as
`index.php`). It raises the default 128M memory limit.

## 7. Run one-time setup (cPanel → Terminal)

Enable SSH first: cPanel → *Exclusive for Namecheap Customers* → *Manage Shell*.

```bash
cd "$HOME/wbimis"
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan push:vapid            # copy the VAPID keys into .env
php artisan config:cache route:cache view:cache
```

The `storage:link` command links the app's own `public/storage`. Since the
domain serves `$HOME/public_html`, also create a link there (only if it does
not already exist):

```bash
ln -s "$HOME/wbimis/storage/app/public" "$HOME/public_html/storage"
```

## 8. Cron jobs (cPanel → Advanced → Cron Jobs)

Namecheap enforces a **5-minute minimum** interval. Add two jobs:

```
# Scheduler (SLA checks, booking cleanup)
*/5 * * * * php /home/CPANEL_USER/wbimis/artisan schedule:run >> /dev/null 2>&1

# Queue worker (non-urgent emails + push notifications)
*/5 * * * * php /home/CPANEL_USER/wbimis/artisan queue:work --stop-when-empty --max-time=280 --sleep=3 >> /dev/null 2>&1
```

Replace `CPANEL_USER` with your cPanel username. Confirm the CLI PHP version
with `php -v`; your current Terminal reports PHP 8.4.27.

## 9. Enable SSL

cPanel → *SSL/TLS Status* → issue the free Let's Encrypt certificate. Set
`SESSION_SECURE_COOKIE=true` after it is active (web push also requires HTTPS).

## Email architecture (why two mailers)

| Email | Mechanism | Delivery |
|---|---|---|
| Registration OTP | Brevo HTTP API (`BrevoMailService`) | **Synchronous** |
| Password reset | Brevo HTTP API | **Synchronous** |
| Student reactivation | Brevo HTTP API | Synchronous |
| Welcome / account-approved | Queued listener | ≤ 5 min |
| Module emails (7 Mailables) | Brevo SMTP via `Mail::to()->queue()` | ≤ 5 min |

## Post-deploy checks

- [ ] `https://yourdomain.com/up` returns `ok`.
- [ ] Register a test account and receive the OTP email promptly.
- [ ] Request a password reset and receive the link promptly.
- [ ] Trigger a queued module email (e.g., approve a service request) and
      confirm it arrives within ~5 minutes.
- [ ] Confirm `/storage` symlink resolves (avatar uploads).
