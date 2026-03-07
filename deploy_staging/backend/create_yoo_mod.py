import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

username = 'manager_yookassa'
password = 'test_pass_9988'
email = 'yookassa_mod@example.com'

if not User.objects.filter(username=username).exists():
    user = User.objects.create_user(username=username, password=password, email=email)
    # Ensure profile is created and has some initial checks just in case
    profile, created = UserProfile.objects.get_or_create(user=user)
    profile.checks_remaining = 10
    profile.save()
    print(f"User {username} created successfully.")
else:
    user = User.objects.get(username=username)
    user.set_password(password)
    user.save()
    print(f"User {username} already existed, password updated.")
