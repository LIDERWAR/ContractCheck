# ContractCheck

Юридический ИИ-ассистент для анализа договоров и контрактов.

## Структура проекта

- **backend/**: Логика Django-сервера, Celery задачи, интеграция с DeepSeek AI.
- **frontend/**: Статический интерфейс (HTML, CSS, JS).
- **.agents/**: Навыки и правила для автономной работы ИИ-ассистентов.

## Технологии

- Python / Django / Celery
- Redis (для Celery)
- PyMuPDF (для работы с PDF)
- DeepSeek AI API (через Polza.ai)
- Vanilla HTML/CSS/JS

## Развертывание

1. Настройте `.env` файл в папке `backend`.
2. Установите зависимости: `pip install -r backend/requirements.txt`.
3. Запустите миграции: `python backend/manage.py migrate`.
4. Запустите сервер и Celery.
