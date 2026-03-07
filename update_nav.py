import os, glob

os.system("git checkout HEAD^ frontend/dashboard.html frontend/profile.html frontend/document.html")

files = glob.glob("frontend/*.html")
for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    new_content = content.replace('<a href="blog/" class="nav-link">Блог</a>', '<a href="contract-ocr.html" class="nav-link">OCR проверка</a>')
    
    if os.path.basename(f) == 'contract-ocr.html':
        new_content = new_content.replace('<a href="contract-ocr.html" class="nav-link">OCR проверка</a>', '<a href="contract-ocr.html" class="nav-link-active">OCR проверка</a>')
    
    if content != new_content:
        with open(f, "w", encoding="utf-8") as file:
            file.write(new_content)
        print(f"Updated {f}")

print("Done update_nav.py")
