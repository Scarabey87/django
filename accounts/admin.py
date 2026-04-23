from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import User
from content.models import CodeActivation


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'full_name', 'is_vip_status', 'vip_expires_at', 'is_staff', 'lower_vip_button']
    list_filter = ['is_vip', 'is_staff', 'is_superuser']
    search_fields = ['username', 'email', 'full_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительная информация', {
            'fields': ('full_name', 'is_vip', 'vip_expires_at')
        }),
    )
    
    def is_vip_status(self, obj):
        """Отображение VIP статуса с иконкой"""
        if obj.is_vip:
            return format_html('<span style="color: green;">✅ VIP</span>')
        return format_html('<span style="color: red;">❌ Обычный</span>')
    is_vip_status.short_description = 'VIP Статус'
    
    def lower_vip_button(self, obj):
        """Кнопка для понижения VIP статуса"""
        if obj.is_vip:
            return format_html(
                '<a class="button" href="{}" style="background: #dc3545; color: white; padding: 8px 15px; '
                'border-radius: 5px; text-decoration: none; font-weight: bold;">⬇️ Понизить статус</a>',
                reverse('admin:lower_user_vip', args=[obj.pk])
            )
        return format_html('<span style="color: #999;">—</span>')
    lower_vip_button.short_description = 'Действия'
    lower_vip_button.allow_tags = True
    
    def get_urls(self):
        """Добавляем custom URL для кнопки понижения"""
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:user_id>/lower-vip/',
                self.admin_site.admin_view(self.lower_vip_status),
                name='lower_user_vip',
            ),
        ]
        return custom_urls + urls
    
    def lower_vip_status(self, request, user_id):
        """
        Обработчик кнопки понижения VIP статуса
        - Сбрасывает is_vip в False
        - Удаляет все активации кодов доступа
        - Очищает vip_expires_at
        """
        from django.contrib import messages
        from django.http import HttpResponseRedirect
        from django.urls import reverse
        
        try:
            user = User.objects.get(pk=user_id)
            
            # Понижаем статус
            user.is_vip = False
            user.vip_expires_at = None
            user.save()
            
            # 🚨 УДАЛЯЕМ ВСЕ АКТИВАЦИИ КОДОВ ДОСТУПА
            deleted_count, _ = CodeActivation.objects.filter(user=user).delete()
            
            messages.success(
                request,
                f'✅ Статус пользователя {user.username} понижен до обычного. '
                f'Удалено активаций кодов: {deleted_count}'
            )
            
        except User.DoesNotExist:
            messages.error(request, 'Пользователь не найден')
        except Exception as e:
            messages.error(request, f'Ошибка: {str(e)}')
        
        return HttpResponseRedirect(reverse('admin:accounts_user_changelist'))


# Регистрируем модель с кастомной админкой
admin.site.unregister(User)
admin.site.register(User, UserAdmin)