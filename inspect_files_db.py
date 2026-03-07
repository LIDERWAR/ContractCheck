import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Document

docs = Document.objects.filter(status='processed').order_by('-uploaded_at')[:5]
print("Last 5 processed documents:")
for d in docs:
    print(f"ID: {d.id}, Name: {d.name}, Status: {d.status}")
    print(f"  Original: {d.file.name if d.file else 'None'}")
    print(f"  Improved: {d.improved_file.name if d.improved_file else 'None'}")
    if d.improved_file:
        print(f"  Improved Path exists: {os.path.exists(d.improved_file.path)}")
