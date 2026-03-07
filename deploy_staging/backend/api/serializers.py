from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Document, UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['subscription_tier', 'checks_remaining', 'total_checks_count']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'name', 'file', 'uploaded_at', 'status', 'score', 'summary', 'risks', 'recommendations', 'improved_file', 'pages_processed', 'total_pages']
        read_only_fields = ['id', 'uploaded_at', 'status', 'score', 'summary', 'risks', 'recommendations', 'improved_file', 'pages_processed', 'total_pages']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        
        # Если пользователь на фри-плане, скрываем улучшенный файл
        if request and request.user.is_authenticated:
            # На всякий случай проверяем наличие профиля
            profile = getattr(request.user, 'profile', None)
            if profile and profile.subscription_tier == 'free':
                ret['improved_file'] = None
        
        return ret
