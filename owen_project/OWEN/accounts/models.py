from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    full_name = models.CharField("Полное имя", max_length=100, blank=True)
    is_vip = models.BooleanField("VIP Статус", default=False)
    vip_expires_at = models.DateTimeField("Истекает VIP", null=True, blank=True)

    def check_vip_status(self):
        """Проверяет и обновляет статус VIP"""
        if self.is_vip and self.vip_expires_at:
            if timezone.now() > self.vip_expires_at:
                self.is_vip = False
                self.vip_expires_at = None
                self.save()
                return False
        return self.is_vip

    @property
    def time_left(self):
        if self.vip_expires_at and self.is_vip:
            return self.vip_expires_at - timezone.now()
        return None