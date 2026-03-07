import os
import re

def fix_content(content):
    # Пытаемся найти участки, которые выглядят как UTF-8 байты, интерпретированные как CP1251
    # Основные признаки: последовательности начинаются с Р (D0) или С (D1)
    
    def replacer(match):
        text = match.group(0)
        try:
            # Пробуем закодировать обратно в байты CP1251 и декодировать как UTF-8
            return text.encode('cp1251').decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            return text

    # Ищем последовательности "битых" символов (кириллица CP1251)
    # В Unicode это часто символы из диапазона \u00C0-\u00FF (латиница-1, которая совпадает с байтами CP1251)
    # Но в Python после ошибочного декодирования они могут превратиться в Р, С и т.д.
    # Самый надежный способ - искать символы, которые при кодировании в CP1251 дают валидный UTF-8
    
    result = ""
    i = 0
    while i < len(content):
        # Пробуем взять максимально длинную последовательность, которая фиксится
        fixed = False
        for length in range(min(50, len(content) - i), 1, -1):
            chunk = content[i:i+length]
            try:
                # Если все символы в чанке можно представить в CP1251
                b = chunk.encode('cp1251')
                # И это валидный UTF-8
                decoded = b.decode('utf-8')
                if decoded != chunk and len(decoded) < len(chunk): # Двойная кодировка обычно "раздувает" текст
                    result += decoded
                    i += length
                    fixed = True
                    break
            except:
                continue
        
        if not fixed:
            result += content[i]
            i += 1
            
    return result

def process_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    fixed = fix_content(content)
                    
                    if fixed != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(fixed)
                        print(f"✅ Исправлен: {path}")
                except Exception as e:
                    print(f"❌ Ошибка при обработке {path}: {e}")

if __name__ == "__main__":
    process_files(r"d:\contractcheck\frontend")
