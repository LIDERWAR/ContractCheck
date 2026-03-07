from rest_framework.views import APIView
import os
import hashlib
import logging
import ipaddress
from rest_framework.response import Response
from django.http import HttpResponse
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework import generics
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Document, Transaction, UserProfile
from .serializers import DocumentSerializer, UserSerializer
from .tasks import analyze_document_task
from yookassa import Configuration, Payment

logger = logging.getLogger(__name__)

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token

# Social Auth
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.vk.views import VKOAuth2Adapter
from allauth.socialaccount.providers.yandex.views import YandexOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView

from rest_framework.throttling import AnonRateThrottle

class RegisterThrottle(AnonRateThrottle):
    scope = 'register'

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterThrottle]
    def post(self, request):
        # 1. Honeypot check
        if request.data.get('middle_name'): # Скрытое поле "Отчество"
             logger.warning(f"Honeypot triggered from IP: {request.META.get('REMOTE_ADDR')}")
             # Имитируем успех для бота
             return Response({"status": "created", "token": "mock_token_for_bot", "username": "user"}, status=status.HTTP_201_CREATED)

        # 2. Yandex SmartCaptcha check
        smart_token = request.data.get('smart-token')
        if not smart_token and not settings.DEBUG: # В дебаге можно без нее, если нужно
             return Response({"error": "Требуется проверка капчей"}, status=status.HTTP_400_BAD_REQUEST)
        
        if smart_token:
            import requests
            verify_url = "https://smartcaptcha.yandexcloud.net/validate"
            resp = requests.post(verify_url, data={
                "token": smart_token,
                "client_ip": request.META.get('REMOTE_ADDR'),
                "secret": settings.YANDEX_SMARTCAPTCHA_SERVER_KEY
            }, timeout=5)
            
            if resp.status_code != 200 or not resp.json().get("status") == "ok":
                logger.warning(f"SmartCaptcha failed for IP {request.META.get('REMOTE_ADDR')}: {resp.text}")
                return Response({"error": "Проверка капчей не пройдена. Попробуйте еще раз."}, status=status.HTTP_400_BAD_REQUEST)

        username = request.data.get('username') or request.data.get('email')
        password = request.data.get('password')
        email = request.data.get('email')
        
        if not username or not password:
             return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)
             
        if User.objects.filter(username=username).exists():
             return Response({"error": "User already exists"}, status=status.HTTP_400_BAD_REQUEST)
             
        user = User.objects.create_user(username=username, email=email, password=password)
        token, created = Token.objects.get_or_create(user=user)
        return Response({"status": "created", "token": token.key, "username": user.username, "email": user.email}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        login_input = request.data.get('username') or request.data.get('email')
        password = request.data.get('password')
        
        if not login_input or not password:
             return Response({"error": "Требуются логин и пароль"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Пробуем аутентифицировать как имя пользователя (username)
        user = authenticate(request, username=login_input, password=password)
        
        # 2. Если не удалось, пробуем найти пользователя по email
        if user is None:
            try:
                # Ищем пользователя, у которого email совпадает с вводом
                user_obj = User.objects.get(email=login_input)
                # Аутентифицируем по его username
                user = authenticate(request, username=user_obj.username, password=password)
            except (User.DoesNotExist, User.MultipleObjectsReturned):
                pass
        
        if user is not None:
            token, created = Token.objects.get_or_create(user=user)
            return Response({"status": "ok", "token": token.key, "username": user.username, "email": user.email}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Неверный логин или пароль"}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"status": "logged out"}, status=status.HTTP_200_OK)

class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({"status": "ok", "message": "ContractCheck Backend is running"}, status=status.HTTP_200_OK)

from .tasks import prepare_document_task, analyze_document_task


class ContractAnalysisView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Valid extensions
        valid_extensions = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png']
        file_ext = os.path.splitext(file_obj.name)[1].lower()
        if file_ext not in valid_extensions:
             return Response({"error": f"Unsupported file type. Supported: {', '.join(valid_extensions)}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = request.user
            if not user.is_authenticated:
                # Симуляция для гостей
                return Response({
                    "id": "guest_simulation",
                    "status": "guest_simulation",
                    "is_guest": True,
                    "name": file_obj.name,
                    "size": file_obj.size,
                    "message": "Starting guest simulation"
                }, status=status.HTTP_201_CREATED)
            
            # Check limits
            profile, created = UserProfile.objects.get_or_create(user=user)
            if profile.checks_remaining <= 0:
                 return Response({
                     "error": "Limit reached", 
                     "details": "У вас закончились доступные проверки. Пожалуйста, обновите тариф."
                 }, status=status.HTTP_403_FORBIDDEN)
            
            # 1. Сохраняем документ
            document = Document.objects.create(file=file_obj, user=user, status='pending')
            
            # 2. Быстрый парсинг (подсчет страниц)
            import threading
            threading.Thread(target=prepare_document_task, args=(document.id,)).start()

            serializer = DocumentSerializer(document)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Unexpected error in view: {e}")
            return Response({"error": f"Unexpected server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StartAnalysisView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            document = Document.objects.get(pk=pk, user=request.user)
            if document.status != 'awaiting_analysis':
                return Response({"error": "Document is not ready for analysis"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Запуск ИИ анализа
            import threading
            threading.Thread(target=analyze_document_task, args=(document.id,)).start()
            
            return Response({"status": "processing", "message": "Analysis started"}, status=status.HTTP_200_OK)
        except Document.DoesNotExist:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

# --- SOCIAL LOGIN VIEWS ---

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client

    @property
    def callback_url(self):
        return self.request.data.get('callback_url') or f"{settings.FRONTEND_URL}/login.html"

class VKLogin(SocialLoginView):
    adapter_class = VKOAuth2Adapter
    # VK не требует строгого callback_url здесь для обмена кода

class YandexLogin(SocialLoginView):
    adapter_class = YandexOAuth2Adapter
    client_class = OAuth2Client
    
    @property
    def callback_url(self):
        return self.request.data.get('callback_url') or f"{settings.FRONTEND_URL}/login.html"

class DocumentListView(generics.ListAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Document.objects.filter(user=user).order_by('-uploaded_at')
        return Document.objects.none()

from django.db.models import Q

class DocumentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Document.objects.filter(user=user)

class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        # Ensure profile exists before serialization
        UserProfile.objects.get_or_create(user=request.user)
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not current_password or not new_password:
            return Response({"error": "Требуются старый и новый пароли"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(current_password):
            return Response({"error": "Неверный текущий пароль"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 8:
            return Response({"error": "Пароль должен быть не менее 8 символов"}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"status": "ok", "message": "Пароль успешно изменен"}, status=status.HTTP_200_OK)

# --- YOOKASSA INTEGRATION ---

PLANS = {
    'single': {'price': 50, 'checks': 1, 'name': 'Разовая проверка'},
    'pro': {'price': 1000, 'checks': 20, 'name': 'PRO План'},
    'business': {'price': 4900, 'checks': 100, 'name': 'Бизнес План'},
}

class CreatePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        if plan_id not in PLANS:
            return Response({"error": "Invalid plan"}, status=status.HTTP_400_BAD_REQUEST)

        plan = PLANS[plan_id]
        
        # 1. Setup YooKassa
        Configuration.account_id = os.getenv('YOOKASSA_SHOP_ID')
        Configuration.secret_key = os.getenv('YOOKASSA_SECRET_KEY')

        # 2. Create pending transaction
        transaction = Transaction.objects.create(
            user=request.user,
            amount=plan['price'],
            checks_count=plan['checks'],
            status='pending'
        )

        try:
            # 3. Create YooKassa Payment
            payment = Payment.create({
                "amount": {
                    "value": f"{plan['price']:.2f}",
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": f"{settings.FRONTEND_URL}/payment-success.html"
                },
                "capture": True,
                "description": f"Пополнение {plan['checks']} проверок для {request.user.username}",
                "metadata": {
                    "transaction_id": transaction.id,
                    "user_id": request.user.id
                }
            })

            # Store YooKassa payment ID
            transaction.payment_id = payment.id
            transaction.save()

            return Response({"payment_url": payment.confirmation.confirmation_url})
        except Exception as e:
            logger.error(f"YooKassa payment creation failed: {e}")
            return Response({
                "error": "Ошибка при создании платежа в ЮKassa",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Проверка IP-адреса отправителя (безопасность)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        yookassa_ips = [
            '185.71.76.0/27',
            '185.71.77.0/27',
            '77.75.153.0/25',
            '77.75.154.128/25',
            '77.75.156.11',
            '77.75.156.35'
        ]

        is_valid_ip = False
        try:
            client_ip = ipaddress.ip_address(ip)
            for cidr in yookassa_ips:
                if '/' in cidr:
                    if client_ip in ipaddress.ip_network(cidr):
                        is_valid_ip = True
                        break
                else:
                    if client_ip == ipaddress.ip_address(cidr):
                        is_valid_ip = True
                        break
        except Exception as e:
            logger.error(f"IP validation error: {e}")
            return Response("Invalid IP", status=status.HTTP_403_FORBIDDEN)

        if not is_valid_ip and not settings.DEBUG:
            logger.warning(f"Unauthorized Webhook attempt from IP: {ip}")
            return Response("Forbidden", status=status.HTTP_403_FORBIDDEN)

        event_json = request.data
        
        try:
            # YooKassa sends notification object
            # We should ideally verify the source IP or use signatures if configured
            if event_json.get('event') == 'payment.succeeded':
                payment_data = event_json.get('object', {})
                transaction_id = payment_data.get('metadata', {}).get('transaction_id')
                
                if not transaction_id:
                     return Response("ok", status=200)

                transaction = Transaction.objects.get(id=transaction_id)
                if transaction.status == 'pending':
                    transaction.status = 'completed'
                    transaction.save()

                    # Credit user profile
                    profile, created = UserProfile.objects.get_or_create(user=transaction.user)
                    profile.checks_remaining += transaction.checks_count
                    
                    # Update tier
                    if transaction.checks_count >= 100:
                        profile.subscription_tier = 'business'
                    elif transaction.checks_count >= 20:
                        if profile.subscription_tier != 'business':
                            profile.subscription_tier = 'pro'
                    
                    profile.save()
                    logger.info(f"YooKassa: Success. Credited {transaction.checks_count} checks to {transaction.user.username}")
            
            return Response("ok", status=200)
        except Exception as e:
            logger.error(f"YooKassa webhook error: {e}")
            return Response("fail", status=status.HTTP_400_BAD_REQUEST)
