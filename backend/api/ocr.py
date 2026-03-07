import logging
import io

logger = logging.getLogger(__name__)


def extract_text_from_image(file_path):
    """
    Извлекает текст из изображения (JPG, PNG) через pytesseract (лёгкий OCR).
    Принимает путь к файлу.
    """
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(file_path)
        # Распознаём русский + английский текст
        text = pytesseract.image_to_string(img, lang='rus+eng')

        if not text.strip():
            logger.warning(f"Tesseract: текст не обнаружен в {file_path}")
            return ""

        return text.strip()
    except Exception as e:
        logger.error(f"OCR Error: {e}")
        return ""

def extract_text_from_image_bytes(img_bytes):
    """
    Извлекает текст из байтов изображения.
    Голодный импорт pytesseract и PIL.
    """
    try:
        import pytesseract
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(img_bytes))
        text = pytesseract.image_to_string(img, lang='rus+eng')
        return text.strip()
    except Exception as e:
        logger.error(f"OCR Bytes Error: {e}")
        return ""
