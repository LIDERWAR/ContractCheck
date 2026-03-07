import os
import re
import glob

html_dir = "frontend"
css_link = '<link rel="stylesheet" href="css/output.css">'

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # Remove CDN script
    content = re.sub(r'<script src="https://cdn\.tailwindcss\.com"></script>\s*', '', content)
    
    # Remove tailwind config script block
    config_regex = r'<script>\s*tailwind\.config\s*=\s*{.*?}\s*</script>\s*'
    content = re.sub(config_regex, '', content, flags=re.DOTALL)

    # Insert output.css immediately before <link rel="stylesheet" href="css/style.css"> or similar
    if 'css/output.css' not in content:
        if '<link rel="stylesheet" href="css/style.css">' in content:
            content = content.replace('<link rel="stylesheet" href="css/style.css">', f'{css_link}\n    <link rel="stylesheet" href="css/style.css">')
        elif '</head>' in content:
            content = content.replace('</head>', f'    {css_link}\n</head>')

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes needed for {filepath}")

for root, _, files in os.walk(html_dir):
    for file in files:
        if file.endswith('.html'):
            update_file(os.path.join(root, file))
