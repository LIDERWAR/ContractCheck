import os
import sys

def main():
    try:
        import django
        from datetime import timedelta
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        
        from api.models import Document, DocumentPage
        docs = Document.objects.order_by('-uploaded_at')[:3]
        print("--- Последние документы ---")
        for d in docs:
            print(f"ID: {d.id} | Status: {d.status} | Total Pages: {d.pages.count()}")
            # Проверим, что лежит в file
            if d.file:
                print(f"  Doc File: {d.file.name} | Exists: {os.path.exists(d.file.path)}")
            for p in d.pages.all()[:3]:
                txt_len = len(p.extracted_text) if p.extracted_text else 0
                path = p.file.path if p.file else "None"
                exists = os.path.exists(path) if p.file else False
                print(f"  Page {p.order} txt len: {txt_len} | Path: {path} | Exists: {exists}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
