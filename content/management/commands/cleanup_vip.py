from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from content.models import CodeActivation


class Command(BaseCommand):
    help = 'Очистка просроченных VIP статусов и кодов активации'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Понижение пользователей с истёкшим VIP
        expired_users = User.objects.filter(
            is_vip=True, 
            vip_expires_at__lt=now
        )
        count_users = expired_users.count()
        expired_users.update(is_vip=False, vip_expires_at=None)
        
        # Удаление просроченных активаций кодов
        expired_activations = CodeActivation.objects.filter(expires_at__lt=now)
        count_activations = expired_activations.count()
        expired_activations.delete()
        
        # Вывод отчёта
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Обновлено {count_users} пользователей'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Удалено {count_activations} просроченных активаций'
            )
        )