# Конфигурация Gunicorn для продакшна
# Использование: gunicorn -c gunicorn.conf.py config.wsgi:application

# Адрес и порт (Django слушает здесь, Nginx проксирует сюда)
bind = "127.0.0.1:8000"

# Количество воркеров: (2 * CPU_cores) + 1
workers = 3

# Тип воркера (sync хорош для большинства случаев)
worker_class = "sync"

# Таймаут (секунды) — увеличен из-за долгого AI-анализа
timeout = 120

# Логирование
accesslog = "/var/log/contractcheck/gunicorn_access.log"
errorlog = "/var/log/contractcheck/gunicorn_error.log"
loglevel = "info"

# Перезапуск воркеров при утечке памяти
max_requests = 1000
max_requests_jitter = 100
