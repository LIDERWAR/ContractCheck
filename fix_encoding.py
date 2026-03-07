import os
import glob

def fix_file(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return # Not utf-8 double encoded
        
    # Check if there are Cyrillic characters decoded as CP1251 (e.g., 'Р')
    if 'Р' in content or 'С' in content: 
        try:
            fixed_content = content.encode('cp1251').decode('utf-8')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f'Fixed {path}')
        except Exception as e:
            pass # print(f'Could not fix {path} (maybe not double-encoded): {e}')

html_files = glob.glob(r'd:\contractcheck\frontend\**\*.html', recursive=True)
for path in html_files:
    fix_file(path)
