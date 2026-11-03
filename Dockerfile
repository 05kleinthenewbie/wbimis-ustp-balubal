# syntax=docker/dockerfile:1

FROM php:8.4-apache-bookworm

ARG NODE_MAJOR=22

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        $PHPIZE_DEPS \
        ca-certificates \
        curl \
        git \
        libonig-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        mbstring \
        opcache \
        pdo_mysql \
        zip \
    && curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && a2enmod rewrite deflate filter expires headers \
    && printf '%s\n' \
        '<IfModule mod_deflate.c>' \
        '    AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml text/javascript application/javascript application/json application/xml image/svg+xml' \
        '</IfModule>' \
        '<IfModule mod_expires.c>' \
        '    ExpiresActive On' \
        '    ExpiresByType text/css "access plus 1 month"' \
        '    ExpiresByType text/javascript "access plus 1 month"' \
        '    ExpiresByType application/javascript "access plus 1 month"' \
        '    ExpiresByType image/svg+xml "access plus 1 month"' \
        '    ExpiresByType image/png "access plus 1 month"' \
        '    ExpiresByType image/jpeg "access plus 1 month"' \
        '    ExpiresByType font/woff2 "access plus 1 year"' \
        '    ExpiresByType font/woff "access plus 1 year"' \
        '</IfModule>' \
        '<IfModule mod_headers.c>' \
        '    <Directory /var/www/html/public/build>' \
        '        Header set Cache-Control "public, max-age=31536000, immutable"' \
        '    </Directory>' \
        '</IfModule>' \
        > /etc/apache2/conf-available/performance.conf \
    && a2enconf performance \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN sed -ri "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/*.conf \
    && sed -ri "s!/var/www/!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && printf '<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n</Directory>\n' > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel

COPY docker/php.ini /usr/local/etc/php/conf.d/99-wbimis.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && cp .env.example .env \
    && export APP_KEY="base64:$(head -c 32 /dev/urandom | base64 | tr -d '\n')" \
    && composer dump-autoload --no-dev --optimize --no-interaction \
    && npm run build \
    && rm -f .env \
    && rm -rf node_modules \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["entrypoint"]
