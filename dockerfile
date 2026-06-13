FROM php:8.2-cli

# Installer les extensions nécessaires
RUN apt-get update && apt-get install -y libpq-dev sqlite3 \
    && docker-php-ext-install pdo pdo_sqlite

# Copier les fichiers
COPY . /app/
WORKDIR /app

# Donner les permissions pour SQLite
RUN chmod 777 /app

# Exposer le port
EXPOSE 10000

# Lancer le serveur PHP
CMD php -S 0.0.0.0:10000 -t /app
