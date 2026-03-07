
import sqlite3
import os

db_path = 'db.sqlite3'
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Сначала узнаем ID пользователя serg@vlprime.ru
    cursor.execute("SELECT id FROM auth_user WHERE email='serg@vlprime.ru'")
    user_row = cursor.fetchone()
    
    if user_row:
        user_id = user_row[0]
        # 2. Обновляем его профиль
        cursor.execute("UPDATE api_userprofile SET subscription_tier='pro', checks_remaining=100 WHERE user_id=?", (user_id,))
        conn.commit()
        print(f"Updated user serg@vlprime.ru (ID: {user_id}) to PRO with 100 checks.")
    else:
        print("User serg@vlprime.ru not found.")
        
    # 3. Также исправим всех 'basic' на 'pro'
    cursor.execute("UPDATE api_userprofile SET subscription_tier='pro' WHERE subscription_tier='basic'")
    conn.commit()
    print("Updated all 'basic' tiers to 'pro'.")
    
    # 4. Проверим результат
    cursor.execute("SELECT u.email, p.subscription_tier, p.checks_remaining FROM api_userprofile p JOIN auth_user u ON p.user_id = u.id")
    rows = cursor.fetchall()
    for row in rows:
        print(f"User: {row[0]}, Tier: {row[1]}, Checks: {row[2]}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
