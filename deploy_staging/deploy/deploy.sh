#!/bin/bash
# =============================================================
# Скрипт деплоя ContractCheck.ru на Ubuntu VPS
# Запускать: bash deploy.sh
# Предварительно: скопировать проект в /var/www/contractcheck/
# =============================================================

set -e
echo "🚀 Начинаем деплой ContractCheck.ru..."

PROJECT_DIR="/var/www/contractcheck"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# --- 1. Системные зависимости ---
echo "📦 Устанавливаем системные пакеты..."
apt-get update -qq
apt-get install -y python3 python3-pip python3-venv \
    postgresql postgresql-contrib \
    nginx redis-server unzip \
    certbot python3-certbot-nginx \
    git curl

# --- 2. PostgreSQL ---
echo "🐘 Настраиваем PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE contractcheck_db;" 2>/dev/null || echo "БД уже существует"
sudo -u postgres psql -c "CREATE USER cc_user WITH PASSWORD 'СМЕНИТЬ_ПАРОЛЬ';" 2>/dev/null || echo "Пользователь уже существует"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE contractcheck_db TO cc_user;"
sudo -u postgres psql -c "ALTER DATABASE contractcheck_db OWNER TO cc_user;"

# --- 3. Python venv ---
echo "🐍 Создаём виртуальное окружение..."
cd "$BACKEND_DIR"
rm -rf venv
python3 -m venv venv
VENV_PYTHON="$BACKEND_DIR/venv/bin/python"
VENV_PIP="$BACKEND_DIR/venv/bin/pip"

echo "📦 Устанавливаем зависимости из requirements.txt..."
$VENV_PIP install --upgrade pip
$VENV_PIP install -r requirements.txt
$VENV_PIP list # Текущий список для отладки

# --- 4. Django setup ---
echo "⚙️ Настраиваем Django..."
$VENV_PYTHON manage.py migrate
$VENV_PYTHON manage.py collectstatic --no-input

# --- 5. Логи ---
echo "📝 Создаём директорию для логов..."
mkdir -p /var/log/contractcheck
chown www-data:www-data /var/log/contractcheck

# --- 6. Systemd сервисы ---
echo "🔧 Устанавливаем Systemd сервисы..."
cp "$PROJECT_DIR/deploy/systemd/contractcheck-gunicorn.service" /etc/systemd/system/
cp "$PROJECT_DIR/deploy/systemd/contractcheck-celery.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable contractcheck-gunicorn contractcheck-celery redis
systemctl start redis

# --- 7. Nginx ---
echo "🌐 Настраиваем Nginx..."
cp "$PROJECT_DIR/deploy/nginx/contractcheck.ru.conf" /etc/nginx/sites-available/contractcheck.ru
ln -sf /etc/nginx/sites-available/contractcheck.ru /etc/nginx/sites-enabled/contractcheck.ru
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# --- 8. SSL ---
echo "🔒 Получаем SSL-сертификат (Let's Encrypt)..."
certbot --nginx -d contractcheck.ru -d www.contractcheck.ru --non-interactive --agree-tos -m admin@contractcheck.ru

# --- 9. Запуск всего ---
echo "▶️ Запускаем сервисы..."
systemctl start contractcheck-gunicorn contractcheck-celery
systemctl status contractcheck-gunicorn --no-pager
systemctl status contractcheck-celery --no-pager

echo ""
echo "✅ Деплой завершён!"
echo "🌍 Сайт: https://contractcheck.ru"
echo ""
echo "⚠️  Не забудь выполнить следующие шаги вручную для завершения настройки:"
echo ""
echo "📝 ШАГ 1: Настройка переменных окружения (.env)"
echo "   Выполни команду:"
echo "   $ nano /var/www/contractcheck/backend/.env"
echo ""
echo "   В файле ОБЯЗАТЕЛЬНО измени:"
echo "   1. DEBUG=False"
echo "   2. DJANGO_SECRET_KEY='сгенерируй_новый_ключ'"
echo "      (Сгенерировать можно командой: python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')"
echo "   3. CELERY_ALWAYS_EAGER=False"
echo "   4. Данные PostgreSQL (DB_NAME, DB_USER, DB_PASSWORD)"
echo "   5. Боевой DEEPSEEK_API_KEY"
echo "   6. Боевые ключи Robokassa (измени TEST_MODE=False)"
echo ""
echo "🔄 ШАГ 2: Перезапуск сервисов после правок .env"
echo "   Выполни:"
echo "   $ sudo systemctl restart contractcheck-gunicorn"
echo "   $ sudo systemctl restart contractcheck-celery"
echo ""
echo "🚀 Удачи! ContractCheck.ru готов к работе."
