
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

def update_user_tier(email, tier, checks):
    try:
        user = User.objects.get(email=email)
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.subscription_tier = tier
        profile.checks_remaining = checks
        profile.save()
        print(f"✅ Успешно обновлен: {email} -> Тариф: {tier}, Проверок: {checks}")
    except User.DoesNotExist:
        print(f"❌ Пользователь не найден: {email}")

if __name__ == "__main__":
    # 1. xx-serg-xx2011@yandex.ru -> БИЗНЕС (business)
    update_user_tier('xx-serg-xx2011@yandex.ru', 'business', 100)
    
    # 2. xx-serg-xx2012@yandex.ru -> ПРО (pro)
    update_user_tier('xx-serg-xx2012@yandex.ru', 'pro', 50)
    
    # 3. xx-serg-xx2013@yandex.ru -> БАЗОВЫЙ (free)
    update_user_tier('xx-serg-xx2013@yandex.ru', 'free', 2)
