from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    full_name = models.CharField("Полное имя", max_length=100, blank=True)
    is_vip = models.BooleanField("VIP Статус", default=False)
    vip_expires_at = models.DateTimeField("Истекает VIP", null=True, blank=True)

    def __str__(self):
        return self.username

    def check_vip_status(self):
        if self.is_vip and self.vip_expires_at:
            if timezone.now() > self.vip_expires_at:
                self.is_vip = False
                self.vip_expires_at = None
                self.save(update_fields=['is_vip', 'vip_expires_at'])
                return False
        return self.is_vip

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"