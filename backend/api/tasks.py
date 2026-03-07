import os
import logging
from io import BytesIO
from celery import shared_task
from django.conf import settings
from api.models import Document, DocumentPage
from api.services import (
    extract_text_from_pdf, 
    extract_text_from_docx, 
    extract_text_from_txt, 
    analyze_contract_with_ai, 
    save_improved_document, 
    convert_doc_to_docx,
    extract_text_from_image
)

logger = logging.getLogger(__name__)

@shared_task
def prepare_document_task(document_id):
    """
    Первичная обработка: извлечение текста.
    Обновляет существующие страницы, созданные во view.
    """
    try:
        document = Document.objects.get(id=document_id)
        
        pages = document.pages.all().order_by('order')
        pages_processed = 0
        total_pages = 0
        
        # Если страниц нет (что странно, так как они создаются во view), попробуем обработать первый файл
        if not pages.exists():
            file_path = document.file.path
            file_ext = os.path.splitext(file_path)[1].lower()
            text = ""
            if file_ext == '.pdf':
                text, pages_processed, total_pages = extract_text_from_pdf(file_path)
            elif file_ext == '.docx':
                text, pages_processed, total_pages = extract_text_from_docx(file_path)
            elif file_ext == '.txt':
                text, pages_processed, total_pages = extract_text_from_txt(file_path)
            elif file_ext in ['.jpg', '.jpeg', '.png']:
                text = extract_text_from_image(file_path)
                pages_processed = 1
                total_pages = 1
                
            if text:
                DocumentPage.objects.create(document=document, order=0, extracted_text=text, file=document.file)
        else:
            # Обрабатываем существующие страницы
            # Если загружен 1 PDF/DOCX (одна страница в БД), из него может быть извлечено N страниц
            if pages.count() == 1:
                page = pages.first()
                file_path = page.file.path
                file_ext = os.path.splitext(file_path)[1].lower()
                text = ""
                
                if file_ext == '.pdf':
                    text, pages_processed, total_pages = extract_text_from_pdf(file_path)
                elif file_ext == '.docx':
                    text, pages_processed, total_pages = extract_text_from_docx(file_path)
                elif file_ext == '.txt':
                    text, pages_processed, total_pages = extract_text_from_txt(file_path)
                elif file_ext in ['.jpg', '.jpeg', '.png']:
                    text = extract_text_from_image(file_path)
                    pages_processed = 1
                    total_pages = 1
                    
                if text:
                    page.extracted_text = text
                    page.save(update_fields=['extracted_text'])
            else:
                # Множество фоток (multiple files)
                for page in pages:
                    file_path = page.file.path
                    text = extract_text_from_image(file_path)
                    if text:
                        page.extracted_text = text
                        page.save(update_fields=['extracted_text'])
                    pages_processed += 1
                    total_pages += 1

        document.pages_processed = pages_processed
        document.total_pages = total_pages
        document.status = 'awaiting_analysis'
        document.save()
        
        return f"Prepared: {pages_processed} pages"

    except Exception as e:
        logger.error(f"Error in prepare_document_task: {e}")
        if 'document' in locals():
            document.status = 'failed'
            document.error_message = str(e)
            document.save()
        return f"Error: {e}"

@shared_task
def analyze_document_task(document_id, is_guest=False):
    """
    Основная задача анализа документа с помощью AI.
    """
    try:
        document = Document.objects.get(id=document_id)
        document.status = 'analyzing'
        document.save()
        
        # 1. Сбор текста изо всех страниц
        pages = document.pages.all().order_by('order') 
        if not pages.exists():
            # Если страниц нет, попробуем пересобрать
            logger.info(f"[CELERY] No pages found for doc {document_id}, retrying preparation...")
            prepare_document_task(document_id)
            pages = document.pages.all().order_by('order')
            
        if not pages.exists():
            raise Exception("Текст для анализа не найден в базе данных после попытки пересборки.")
            
        # Объединяем текст, сохраняя переносы строк для структуры
        text = "\n\n".join([p.extracted_text for p in pages if p.extracted_text])
        
        if not text or len(text.strip()) < 10:
            raise Exception("Не удалось распознать текст договора. Пожалуйста, попробуйте загрузить файл более высокого качества.")

        # The following block was removed as per instruction:
        # is_guest = document.user is None
        # max_pages = 3 if is_guest else 1000
        
        # if not is_guest:
        #     tier = document.user.profile.subscription_tier
        #     if tier == 'pro' or tier == 'business':
        #         max_pages = 1000
        
        # # Собираем текст из DocumentPage
        # pages = document.pages.all().order_by('order')[:max_pages]
        # all_text = [page.extracted_text for page in pages if page.extracted_text]
        # text = "\n\n--- СТРАНИЦА ---\n\n".join(all_text)

        # if not text:
        #     raise Exception("Текст для анализа не найден в базе данных.")

        # 2. AI Анализ
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
        if document.user and not analysis_result.get('is_mock'):
            profile = document.user.profile
            profile.checks_remaining -= 1
            profile.total_checks_count += 1
            profile.save()
        
        return "Success"

    except Exception as e:
        logger.error(f"[CELERY ANALYZE] Ошибка ID {document_id}: {e}")
        document.status = 'failed'
        
        # Если это ошибка техработ, выводим красивое сообщение
        if "maintenance" in str(e).lower() or "технические работы" in str(e).lower():
            document.summary = "Сервис AI-анализа временно недоступен из-за технических работ на стороне провайдера. Ваши данные сохранены, пожалуйста, попробуйте запустить анализ повторно через некоторое время."
        else:
            document.summary = f"Ошибка AI анализа: {str(e)}"
            
        document.save()
        return f"Failed AI: {str(e)}"
