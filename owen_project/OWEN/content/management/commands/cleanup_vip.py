from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from content.models import CodeActivation, AccessCode

class Command(BaseCommand):
    help = 'Очистка просроченных VIP статусов и кодов'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Понижение пользователей
        expired_users = User.objects.filter(is_vip=True, vip_expires_at__lt=now)
        count_users = expired_users.count()
        expired_users.update(is_vip=False, vip_expires_at=None)
        
        # Удаление активаций
        CodeActivation.objects.filter(expires_at__lt=now).delete()
        
        self.stdout.write(self.style.SUCCESS(f'Обновлено {count_users} пользователей. Активации очищены.'))