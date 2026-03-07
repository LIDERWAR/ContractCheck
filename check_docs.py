import sys, os, django
sys.path.append('/var/www/contractcheck/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Document
docs = Document.objects.order_by('-id')[:5]
for d in docs:
    print(f"ID={d.id}, name={d.name}")
    print(f"  file: {d.file.name if d.file else 'None'}")
    print(f"  improved: {d.improved_file.name if d.improved_file else 'None'}")
    print("-" * 40)
