from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    subscription_tier = models.CharField(
        max_length=20, 
        choices=[('free', 'Free'), ('single', 'Single'), ('pro', 'PRO'), ('business', 'Business')],
        default='free'
    )
    checks_remaining = models.IntegerField(default=2)
    total_checks_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username}'s profile"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class Document(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    file = models.FileField(upload_to='contracts/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=255, blank=True)
    
    # Analysis Results
    STATUS_CHOICES = [
        ('pending', 'Pending'),            # File uploaded, but preparation not started
        ('parsing', 'Parsing'),            # Extracting text and counting pages
        ('awaiting_analysis', 'Ready'),    # Preparation complete, ready for AI
        ('processing', 'Processing AI'),   # AI is currently analyzing
        ('processed', 'Processed'),        # Successfully completed
        ('failed', 'Failed'),              # Error during any step
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    score = models.IntegerField(null=True, blank=True)
    summary = models.TextField(null=True, blank=True)
    risks = models.JSONField(null=True, blank=True) # Requires Django 3.1+
    recommendations = models.JSONField(null=True, blank=True)
    improved_file = models.FileField(upload_to='improved_contracts/', null=True, blank=True)
    
    # Page Tracking
    pages_processed = models.IntegerField(null=True, blank=True)
    total_pages = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return self.name or f"Document {self.id}"

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name
        super().save(*args, **kwargs)

class Transaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    checks_count = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Transaction {self.id} - {self.user.username} - {self.status}"
