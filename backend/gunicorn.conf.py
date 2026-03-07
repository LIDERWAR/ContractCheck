# Конфигурация Gunicorn для продакшна
# Использование: gunicorn -c gunicorn.conf.py config.wsgi:application

# Адрес и порт (Django слушает здесь, Nginx проксирует сюда)
bind = "127.0.0.1:8000"

# Количество воркеров: 2 достаточно для малого VPS (экономия RAM)
workers = 2

# Тип воркера (sync хорош для большинства случаев)
worker_class = "sync"

# Таймаут (секунды) — увеличен из-за долгого AI-анализа
timeout = 300

# Логирование
accesslog = "/var/log/contractcheck/gunicorn_access.log"
errorlog = "/var/log/contractcheck/gunicorn_error.log"
loglevel = "info"

# Перезапуск воркеров при утечке памяти (каждые 500 запросов)
max_requests = 500
max_requests_jitter = 50

# Лимит памяти на воркер ~400MB — автоперезапуск при превышении
worker_max_memory = 400 * 1024
