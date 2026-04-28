from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'full_name', 'is_vip', 'vip_expires_at', 'is_staff']
    list_filter = ['is_vip', 'is_staff', 'is_superuser']
    search_fields = ['username', 'email', 'full_name']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительная информация', {
            'fields': ('full_name', 'is_vip', 'vip_expires_at')
        }),
    )