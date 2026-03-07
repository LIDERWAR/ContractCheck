
with open(r'd:\contractcheck\frontend\js\main.js', 'r', encoding='utf-8') as f:
    content = f.read()
    print(f"Open: {content.count('{')}")
    print(f"Close: {content.count('}')}")
