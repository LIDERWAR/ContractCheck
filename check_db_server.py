import os
import sys

def main():
    try:
        import django
        from datetime import timedelta
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        
        from api.models import Document
        docs = Document.objects.order_by('-uploaded_at')[:4]
        print("--- Последние загруженные документы ---")
        for d in docs:
            print(f"ID: {d.id} | Status: {d.status} | Uploaded: {d.uploaded_at}")
            for p in d.pages.all()[:1]:
                txt_len = len(p.extracted_text) if p.extracted_text else 0
                print(f"  Page {p.order} txt len: {txt_len}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
