import os
import re

def fix_double_encoding(content):
    # D0 is Р, D1 is С in CP1251
    # UTF-8 bytes for cyrillic are D0 80 .. D1 8F
    # When decoded as CP1251, they appear as a mix of CP1251 chars
    # Wait: let's just find sequences that were successfully decoded as CP1251 from valid UTF-8
    def replacer(match):
        s = match.group(0)
        try:
            return s.encode('cp1251').decode('utf-8')
        except:
            return s
    
    # regex for characters that represent valid UTF-8 bytes when encoded back to cp1251
    # since we mostly care about Russian, we can just match any contiguous sequence of 
    # characters that CAN be encoded to cp1251, then try to decode utf-8.
    # To avoid messing up valid cp1251, we only replace if it successfully decodes as utf-8 AND is different.
    fixed = re.sub(r'[\x80-\xff]+', replacer, content)
    # the above might be too broad.
    # Let's match typical broken sequences: start with Р or С
    return fixed

def manual_fix(content):
    # Safer: split the file character by character? No, re.sub is fine if we verify it actually parses.
    # Let's write a safe replacer
    def replacer(match):
        s = match.group(0)
        try:
            b = s.encode('cp1251')
            # only decode if it's completely valid utf-8
            decoded = b.decode('utf-8')
            return decoded
        except:
            return s
    # Match sequences of non-ASCII characters that are valid in CP1251
    # Python 3 strings: \x80-\xFF covers the CP1251 upper range. 
    # But wait, some characters like 'Р' are \x0420 in Unicode ! because Python strings are Unicode.
    # Ah! 'Р' is Cyrillic Capital Er (U+0420).
    # In double encoded, the bytes \xD0 became U+0420.
    # What are the Unicode characters that correspond to CP1251 \x80-\xFF?
    # It's better to just encode the whole string to cp1251 where possible.
    pass

def fix_file(path):
    print(f'Checking {path}...')
    # Try reading as utf-8
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # If it read as UTF-8, it might have double-encoding.
        # Let's find parts that can be encoded to cp1251 AND then decoded as utf-8
        # We find maximal substrings that can be encoded to cp1251.
        # Actually, let's just search for typical broken words:
        if 'Р' in content or 'С' in content:
            # We want to isolate the double encoded text from emojis
            # Let's split by characters that CANNOT be cp1251 encoded.
            new_chunks = []
            chunk = ""
            for char in content:
                try:
                    char.encode('cp1251')
                    chunk += char
                except UnicodeEncodeError:
                    # process the previous chunk
                    if chunk:
                        try:
                            # only valid utf-8 bytes?
                            fixed_chunk = chunk.encode('cp1251').decode('utf-8')
                            new_chunks.append(fixed_chunk)
                        except UnicodeDecodeError:
                            new_chunks.append(chunk) # leave as is
                        chunk = ""
                    new_chunks.append(char)
            if chunk:
                try:
                    fixed_chunk = chunk.encode('cp1251').decode('utf-8')
                    new_chunks.append(fixed_chunk)
                except UnicodeDecodeError:
                    new_chunks.append(chunk)
                    
            new_content = ''.join(new_chunks)
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Fixed double-encoding in {path}')
            else:
                print(f'No fix needed for {path} after chunking')

    except UnicodeDecodeError:
        # File is likely natively cp1251
        print(f'{path} failed UTF-8 read. Re-encoding from CP1251...')
        with open(path, 'r', encoding='cp1251') as f:
            content = f.read()
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed native CP1251 to UTF-8 in {path}')

for root, dirs, files in os.walk(r'd:\contractcheck\frontend'):
    for file in files:
        if file.endswith('.html'):
            fix_file(os.path.join(root, file))
