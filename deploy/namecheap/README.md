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

## 1. Build assets locally

Do not run Composer on the shared server — build everything locally and upload.

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

This produces `vendor/` and `public/build/`.

## 2. Upload to the server

Via cPanel File Manager or SFTP, upload everything **except**:

- `.git/`, `.github/`, `.claude/`
- `node_modules/`
- `tests/`, `phpstan.neon`, `phpunit.xml`
- `.env` (create it on the server instead)
- `public/hot`, `public/fonts-manifest.dev.json`
- `test.php`, `serve_err.log`, `serve_out.log`, `*.docx`, `*.md`

## 3. Point the document root at `public/`

cPanel → *Domains* → set the domain's document root to the project's
`public/` directory. This is the most important step.

> If the control panel only lets you use `public_html/`, keep the whole project
> inside `public_html/` and rely on the root-level `index.php` + `.htaccess`
> front-controller shim.

## 4. Configure `.env`

Copy `.env.example` to `.env` on the server and set:

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

## 5. Upload `.user.ini`

Place `deploy/namecheap/.user.ini` in the web-accessible document root (same
directory as `index.php`). It raises the default 128M memory limit.

## 6. Run one-time setup (cPanel → Terminal)

Enable SSH first: cPanel → *Exclusive for Namecheap Customers* → *Manage Shell*.

```bash
cd /home/USER/app
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan push:vapid            # copy the VAPID keys into .env
php artisan config:cache route:cache view:cache
```

## 7. Cron jobs (cPanel → Advanced → Cron Jobs)

Namecheap enforces a **5-minute minimum** interval. Add two jobs:

```
# Scheduler (SLA checks, booking cleanup)
*/5 * * * * /usr/local/bin/php /home/USER/app/artisan schedule:run >> /dev/null 2>&1

# Queue worker (non-urgent emails + push notifications)
*/5 * * * * /usr/local/bin/php /home/USER/app/artisan queue:work --stop-when-empty --max-time=280 --sleep=3 >> /dev/null 2>&1
```

## 8. Enable SSL

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
