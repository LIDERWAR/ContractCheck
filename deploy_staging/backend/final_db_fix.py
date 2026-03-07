
import sqlite3
db_path = 'db.sqlite3'
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Сеты к-во проверок для аккаунтов serg
    serg_emails = ['xx-serg-xx2011@yandex.ru', 'xx-serg-xx2012@yandex.ru', 'xx-serg-xx2013@yandex.ru', 'test_sergey@example.com']
    
    for email in serg_emails:
        cursor.execute("SELECT id FROM auth_user WHERE email=?", (email,))
        row = cursor.fetchone()
        if row:
            user_id = row[0]
            cursor.execute("UPDATE api_userprofile SET subscription_tier='pro', checks_remaining=100 WHERE user_id=?", (user_id,))
            print(f"Set {email} to PRO with 100 checks.")
    
    conn.commit()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
