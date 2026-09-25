FROM php:8.3-cli-alpine AS builder

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-install pdo_pgsql mbstring zip bcmath

COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --no-scripts

COPY . .

RUN composer dump-autoload --optimize

FROM php:8.3-cli-alpine AS runner

RUN apk add --no-cache \
    postgresql-client \
    postgresql-dev \
    libzip-dev \
    oniguruma-dev \
    && docker-php-ext-install pdo_pgsql mbstring zip bcmath

WORKDIR /app

COPY --from=builder /app /app

RUN mkdir -p storage/framework/views \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/logs \
    bootstrap/cache \
    && chmod -R 777 storage bootstrap/cache

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8110

ENTRYPOINT ["docker-entrypoint.sh"]
