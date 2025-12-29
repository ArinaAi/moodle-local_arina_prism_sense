# Use official PHP image with Apache
FROM php:8.2-apache

# Install system dependencies and PHP extensions in single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libxml2-dev \
    unzip \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd \
    zip \
    intl \
    mysqli \
    pdo_mysql \
    opcache \
    soap \
    exif \
    && a2enmod rewrite headers expires \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set Apache ServerName to suppress warning
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Copy PHP configuration for Moodle
COPY moodle.ini /usr/local/etc/php/conf.d/moodle.ini

# Set working directory
WORKDIR /var/www/html

# Copy entire Moodle installation (including the plugin in local/lecturebot)
COPY --chown=www-data:www-data . /var/www/html/

# Set proper permissions for Moodle directories
RUN chmod -R 755 /var/www/html && \
    chmod -R 777 /var/www/html/local && \
    find /var/www/html -type d -exec chmod 755 {} \; && \
    find /var/www/html -type f -exec chmod 644 {} \;

# Create moodledata directory and set permissions
RUN mkdir -p /var/www/moodledata && \
    chown -R www-data:www-data /var/www/moodledata && \
    chmod -R 0777 /var/www/moodledata

# Expose port 80
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]