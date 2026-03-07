import sqlite3
import os

db_path = 'db.sqlite3'
if not os.path.exists(db_path):
    print(f'DB not found at {db_path}')
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Map email prefixes to desired states
# User 1: 2011 -> business/unlimited
# User 2: 2012 -> basic/20 checks
# User 3: 2013 -> free/0 checks (default)

users_to_fix = [
    ('xx-serg-xx2011', 'unlimited', 1000),
    ('xx-serg-xx2012', 'basic', 20),
    ('xx-serg-xx2013', 'free', 0)
]

print("--- Updating User Profiles ---")
for prefix, tier, checks in users_to_fix:
    cursor.execute("SELECT id, email FROM auth_user WHERE email LIKE ?", (prefix + '%',))
    user = cursor.fetchone()
    if user:
        uid, email = user
        cursor.execute("UPDATE api_userprofile SET subscription_tier = ?, checks_remaining = ? WHERE user_id = ?", (tier, checks, uid))
        print(f"Updated {email} (UID: {uid}) to {tier} with {checks} checks.")
    else:
        print(f"Warning: User with prefix '{prefix}' not found.")

conn.commit()

# Final Check
print("\n--- Final User States ---")
cursor.execute('''
    SELECT u.email, p.subscription_tier, p.checks_remaining
    FROM auth_user u
    JOIN api_userprofile p ON u.id = p.user_id
    WHERE u.email LIKE 'xxxserg%'
''')
for res in cursor.fetchall():
    print(f"Email: {res[0]}, Tier: {res[1]}, Checks: {res[2]}")

conn.close()
