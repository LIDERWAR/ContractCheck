from django.urls import path, include
from django.views.generic import TemplateView
from .views import (
    HealthCheckView, ContractAnalysisView, DocumentListView, 
    RegisterView, LoginView, LogoutView, DocumentDetailView, 
    UserInfoView, ChangePasswordView, CreatePaymentView, PaymentWebhookView,
    StartAnalysisView, GoogleLogin, YandexLogin, TransactionStatusView
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('user/info/', UserInfoView.as_view(), name='user-info'),
    path('user/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('analyze/', ContractAnalysisView.as_view(), name='analyze_contract'),
    path('documents/', DocumentListView.as_view(), name='document_list'),
    path('documents/<int:pk>/', DocumentDetailView.as_view(), name='document_detail'),
    path('documents/<int:pk>/analyze/', StartAnalysisView.as_view(), name='start_analysis'),
    path('payment/create/', CreatePaymentView.as_view(), name='payment_create'),
    path('payment/webhook/', PaymentWebhookView.as_view(), name='payment_webhook'),
    path('payment/status/<int:transaction_id>/', TransactionStatusView.as_view(), name='payment_status'),
    
    # Social Auth
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('auth/yandex/', YandexLogin.as_view(), name='yandex_login'),
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    path('accounts/', include('allauth.urls')),
    
    # Этот URL нужен только для того, чтобы Django мог реверсить имя 'password_reset_confirm'
    # Реальная ссылка в письме будет вести на фронтенд (настроено в settings.py)
    path('auth/password/reset/confirm/<str:uidb64>/<str:token>/', 
         TemplateView.as_view(), 
         name='password_reset_confirm'),
]
