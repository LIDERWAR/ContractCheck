
import sqlite3
db_path = 'db.sqlite3'
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Searching for users with 'serg' in email...")
    cursor.execute("SELECT id, email FROM auth_user WHERE email LIKE '%serg%'")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row[0]}, Email: {row[1]}")
    
    # Also check if serg@vlprime.ru exists exactly
    cursor.execute("SELECT id, email FROM auth_user WHERE email='serg@vlprime.ru'")
    row = cursor.fetchone()
    if row:
        print(f"EXACT MATCH FOUND: ID: {row[0]}, Email: {row[1]}")
    else:
        print("EXACT MATCH NOT FOUND.")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
