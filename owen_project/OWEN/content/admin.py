from django.contrib import admin
from .models import Person, Video, AccessCode, CodeActivation, Advertisement

@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'video_count', 'total_views']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'description']
    
    def video_count(self, obj):
        return obj.videos.count()
    video_count.short_description = 'Количество видео'
    
    def total_views(self, obj):
        return obj.total_views
    total_views.short_description = 'Общее количество просмотров'

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'person', 'access_level', 'requires_code', 'views', 'created_at']
    list_filter = ['access_level', 'requires_code', 'person']
    search_fields = ['title', 'description']
    readonly_fields = ['views']

@admin.register(AccessCode)
class AccessCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'duration_hours', 'is_active', 'created_at']
    list_filter = ['is_active', 'duration_hours']
    search_fields = ['code']

@admin.register(CodeActivation)
class CodeActivationAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'activated_at', 'expires_at']
    list_filter = ['activated_at', 'expires_at']
    search_fields = ['user__username', 'code__code']

@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ['title', 'position', 'is_active', 'created_at', 'updated_at']
    list_filter = ['position', 'is_active']
    search_fields = ['title', 'html_content']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'position', 'is_active')
        }),
        ('Контент рекламы', {
            'fields': ('image', 'html_content', 'link_url'),
            'description': 'Загрузите изображение или вставьте HTML код. Если заполнено HTML, оно будет приоритетным.'
        }),
    )