from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from .models import UserProfile, Document, Transaction

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Профиль пользователя'
    fk_name = 'user'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'get_subscription', 'get_checks', 'is_staff')
    
    def get_subscription(self, instance):
        return instance.profile.subscription_tier
    get_subscription.short_description = 'Подписка'
    
    def get_checks(self, instance):
        return instance.profile.checks_remaining
    get_checks.short_description = 'Остаток проверок'

# Перерегистрация User
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'subscription_tier', 'checks_remaining', 'total_checks_count')
    search_fields = ('user__username', 'user__email')
    list_filter = ('subscription_tier',)

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'colored_status', 'score', 'uploaded_at')
    search_fields = ('name', 'user__username')
    list_filter = ('status', 'uploaded_at')
    readonly_fields = ('uploaded_at',)
    actions = ['reset_analysis']

    def colored_status(self, obj):
        colors = {
            'pending': 'gray',
            'parsing': 'blue',
            'ready': 'orange',
            'processing': 'cyan',
            'processed': 'green',
            'failed': 'red',
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    colored_status.short_description = 'Статус'

    @admin.action(description='Перезапустить анализ ИИ')
    def reset_analysis(self, request, queryset):
        queryset.update(status='pending', score=None, summary=None, risks=None, recommendations=None)
        self.message_user(request, f"Анализ перезапущен для {queryset.count()} документов.")

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'amount', 'checks_count', 'colored_status', 'created_at')
    search_fields = ('payment_id', 'user__username')
    list_filter = ('status', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['mark_as_completed']

    def colored_status(self, obj):
        colors = {
            'pending': 'orange',
            'completed': 'green',
            'failed': 'red',
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    colored_status.short_description = 'Статус'

    @admin.action(description='Отметить как выполненные')
    def mark_as_completed(self, request, queryset):
        queryset.update(status='completed')
        self.message_user(request, f"{queryset.count()} транзакций отмечены как выполненные.")
