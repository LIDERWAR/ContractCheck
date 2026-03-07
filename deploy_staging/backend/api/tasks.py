import os
import logging
from io import BytesIO
from celery import shared_task
from django.conf import settings
from .models import Document
from .services import (
    extract_text_from_pdf, 
    extract_text_from_docx, 
    extract_text_from_txt, 
    analyze_contract_with_ai, 
    save_improved_document, 
    convert_doc_to_docx
)

logger = logging.getLogger(__name__)

@shared_task
def prepare_document_task(document_id):
    """Шаг 1: Извлечение текста и подсчет страниц."""
    try:
        document = Document.objects.get(id=document_id)
        document.status = 'parsing'
        document.save()
        
        print(f"--- [CELERY PREPARE] Начало парсинга для документа {document_id} ---")
        
        file_path = document.file.path
        file_ext = os.path.splitext(file_path)[1].lower()
        
        # Определяем лимиты (для парсинга берем максимум, усечение будет при анализе)
        max_pages = 500 
        
        text = None
        pages_processed = 0
        total_pages = 0
        
        try:
            with open(file_path, 'rb') as f:
                file_content = f.read()
                stream = BytesIO(file_content)
                
                if file_ext == '.pdf':
                    text, pages_processed, total_pages = extract_text_from_pdf(stream, max_pages=max_pages)
                elif file_ext == '.docx':
                    text, pages_processed, total_pages = extract_text_from_docx(stream, max_pages=max_pages)
                elif file_ext == '.txt':
                    text, pages_processed, total_pages = extract_text_from_txt(stream, max_pages=max_pages)
            
            if not text:
                raise Exception("Текст не извлечен")
                
            document.pages_processed = pages_processed
            document.total_pages = total_pages
            document.status = 'awaiting_analysis'
            document.save()
            
            print(f"--- [CELERY PREPARE] Парсинг завершен для ID {document_id}: {total_pages} страниц ---")
            return f"Prepared: {total_pages} pages"

        except Exception as e:
            logger.error(f"[CELERY PREPARE] Ошибка извлечения текста ID {document_id}: {e}")
            document.status = 'failed'
            document.summary = f"Ошибка обработки файла: {str(e)}"
            document.save()
            return f"Failed: {str(e)}"

    except Document.DoesNotExist:
        return "Not Found"

@shared_task
def analyze_document_task(document_id):
    """Шаг 2: AI Анализ (после того как текст уже готов)."""
    try:
        document = Document.objects.get(id=document_id)
        if document.status != 'awaiting_analysis' and document.status != 'processing':
             # Allow re-run if needed, but primary flow is awaiting -> processing
             pass

        document.status = 'processing'
        document.save()
        
        print(f"--- [CELERY ANALYZE] Начало AI анализа для документа {document_id} ---")
        
        file_path = document.file.path
        file_ext = os.path.splitext(file_path)[1].lower()
        
        # 1. Снова извлекаем текст, но теперь с учетом ПЛАНА (лимитов страниц)
        is_guest = document.user is None
        max_pages = 3 # Default Free
        
        if not is_guest:
            tier = document.user.profile.subscription_tier
            if tier == 'pro':
                max_pages = 1000
            elif tier == 'business':
                max_pages = 1000
        
        # Извлекаем текст повторно с жестким лимитом для ИИ
        text = None
        pages_processed_ai = 0
        with open(file_path, 'rb') as f:
            file_content = f.read()
            stream = BytesIO(file_content)
            if file_ext == '.pdf':
                text, pages_processed_ai, _ = extract_text_from_pdf(stream, max_pages=max_pages)
            elif file_ext == '.docx':
                text, pages_processed_ai, _ = extract_text_from_docx(stream, max_pages=max_pages)
            elif file_ext == '.txt':
                text, pages_processed_ai, _ = extract_text_from_txt(stream, max_pages=max_pages)

        # Обновляем количество реально обработанных страниц для отчета
        document.pages_processed = pages_processed_ai
        document.save()

        # 2. AI Анализ
        try:
            print(f"--- [CELERY ANALYZE] Запуск AI для ID {document_id} (лимит {max_pages} стр.) ---")
            analysis_result = analyze_contract_with_ai(text, force_mock=is_guest)
            
            if "error" in analysis_result:
                raise Exception(analysis_result.get('error'))
            
            document.score = analysis_result.get('score')
            document.summary = analysis_result.get('summary')
            document.risks = analysis_result.get('risks')
            document.recommendations = analysis_result.get('recommendations')
            
            # Сохранение улучшенного файла
            rewritten_text = analysis_result.get('rewritten_text')
            if rewritten_text:
                improved_content_file = save_improved_document(
                    text=rewritten_text, 
                    original_filename=document.file.name
                )
                document.improved_file.save(improved_content_file.name, improved_content_file, save=False)
            
            document.status = 'processed'
            document.save()

            # 3. Обновление баланса
            if document.user:
                profile = document.user.profile
                profile.checks_remaining -= 1
                profile.total_checks_count += 1
                profile.save()
            
            print(f"--- [CELERY ANALYZE] AI анализ успешно завершен для ID {document_id} ---")
            return "Success"

        except Exception as e:
            logger.error(f"[CELERY ANALYZE] Ошибка AI ID {document_id}: {e}")
            document.status = 'failed'
            document.summary = f"Ошибка AI анализа: {str(e)}"
            document.save()
            return f"Failed AI: {str(e)}"

    except Document.DoesNotExist:
        return "Not Found"
    except Exception as e:
        logger.error(f"[CELERY ANALYZE] Ошибка: {e}")
        return str(e)
