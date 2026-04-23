from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Sum, Q
from .models import (
    Person, Video, AccessCode, Advertisement, 
    PollTag, PollVote, SiteVisit, SiteSettings, VideoViewLog
)


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'video_count', 'total_views']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    
    def video_count(self, obj):
        return obj.videos.count()
    video_count.short_description = '🎬 Видео'
    
    def total_views(self, obj):
        return obj.total_views
    total_views.short_description = '👁 Просмотры'


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'person', 'access_level', 'views', 'created_at']
    list_filter = ['access_level', 'person', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['views', 'created_at']
    fields = ['person', 'title', 'description', 'video_file', 'access_level', 'requires_code']
    ordering = ['-views']


@admin.register(AccessCode)
class AccessCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'duration_days_display', 'is_active', 'created_at', 'expiry_status']
    list_filter = ['is_active', 'duration_days', 'created_at']
    search_fields = ['code']
    fields = ['code', 'duration_days', 'is_active']
    
    def duration_days_display(self, obj):
        return f"{obj.duration_days} дн."
    duration_days_display.short_description = 'Длительность (дни)'
    
    def expiry_status(self, obj):
        if not obj.created_at:
            return format_html('<span style="color: gray;">⚪</span>')
        expires_at = obj.created_at + timedelta(days=obj.duration_days)
        time_left = expires_at - timezone.now()
        if time_left.total_seconds() <= 0:
            return format_html('<span style="color: red;">⏰ Истёк</span>')
        days = int(time_left.total_seconds() / 86400)
        return format_html('<span style="color: green;">✅ {} дн.</span>', days)
    expiry_status.short_description = 'Статус'
    
    actions = ['delete_expired_codes']
    def delete_expired_codes(self, request, queryset):
        expired = queryset.filter(created_at__lt=timezone.now() - timedelta(days=30))
        count = expired.count()
        expired.delete()
        self.message_user(request, f'✅ Удалено {count} истёкших кодов')
    delete_expired_codes.short_description = '🗑️ Удалить истёкшие'


# ✅ УБРАНО: вкладка "Голоса" (PollVote)


@admin.register(PollTag)
class PollTagAdmin(admin.ModelAdmin):
    list_display = ['tag', 'active_question_display', 'vote_count_display', 'created_at']
    list_filter = ['created_at']
    search_fields = ['tag', 'active_question']
    readonly_fields = ['created_at', 'updated_at', 'vote_count_display']
    fields = ['tag', 'active_question', 'created_at', 'updated_at']
    
    def active_question_display(self, obj):
        return obj.active_question[:50] + '...' if len(obj.active_question) > 50 else obj.active_question
    active_question_display.short_description = 'Активный вопрос'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(votes_count=Count('votes'))
    
    def vote_count_display(self, obj):
        count = getattr(obj, 'votes_count', None) or obj.vote_count
        color = '#28a745' if count > 10 else '#ffc107' if count > 5 else '#6c757d'
        icon = '🔥' if count > 10 else '⭐' if count > 5 else '📊'
        return format_html('<span style="color: {}; font-weight: bold;">{} {} голосов</span>', color, icon, count)
    vote_count_display.short_description = '📊 Голоса'
    
    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """✅ Настройки сайта: ТОЛЬКО ДОНАТ"""
    list_display = ['__str__', 'donation_amount', 'donation_days', 'updated_at']
    readonly_fields = ['updated_at']
    
    fieldsets = (
        ('💳 Настройки доната', {
            'fields': (
                ('donation_card', 'donation_card_alt'),
                ('donation_amount', 'donation_days'),
                'donation_email',
            ),
            'description': 'Настройте параметры доната.'
        }),
        ('ℹ️', {'fields': ('updated_at',), 'classes': ('collapse',)}),
    )
    
    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()
    def has_delete_permission(self, request, obj=None):
        return False
    
    def save_model(self, request, obj, form, change):
        from django.core.cache import cache
        cache.delete('site_settings')
        cache.delete('donation_context')
        super().save_model(request, obj, form, change)
    
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['title'] = '⚙️ Настройки сайта'
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(SiteVisit)
class SiteVisitAdmin(admin.ModelAdmin):
    """✅ Админка для посещений сайта"""
    list_display = ['visited_at', 'get_user_or_ip', 'page']
    list_filter = ['visited_at', 'user']
    search_fields = ['ip_address', 'user__username', 'page']
    readonly_fields = ['ip_address', 'user', 'page', 'visited_at', 'user_agent']
    date_hierarchy = 'visited_at'
    
    def get_user_or_ip(self, obj):
        if obj.user:
            return format_html('<span style="color: #28a745;">👤 {}</span>', obj.user.username)
        return format_html('<span style="color: #0077B6;">🌐 {}</span>', obj.ip_address or 'Unknown')
    get_user_or_ip.short_description = 'Посетитель'
    
    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        
        extra_context['total_visits'] = SiteVisit.objects.count()
        extra_context['visits_today'] = SiteVisit.objects.filter(visited_at__date=timezone.now().date()).count()
        extra_context['visits_week'] = SiteVisit.objects.filter(visited_at__gte=timezone.now() - timedelta(days=7)).count()
        extra_context['visits_month'] = SiteVisit.objects.filter(visited_at__gte=timezone.now() - timedelta(days=30)).count()
        
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(VideoViewLog)
class VideoViewLogAdmin(admin.ModelAdmin):
    """✅ Админка для логов просмотров видео"""
    list_display = ['viewed_at', 'video_title', 'get_user_or_ip']
    list_filter = ['viewed_at', 'video', 'user']
    search_fields = ['video__title', 'ip_address', 'user__username']
    readonly_fields = ['video', 'user', 'ip_address', 'viewed_at']
    date_hierarchy = 'viewed_at'
    
    def video_title(self, obj):
        return obj.video.title[:40] + '...' if len(obj.video.title) > 40 else obj.video.title
    video_title.short_description = 'Видео'
    
    def get_user_or_ip(self, obj):
        if obj.user:
            return format_html('<span style="color: #28a745;">👤 {}</span>', obj.user.username)
        return format_html('<span style="color: #0077B6;">🌐 {}</span>', obj.ip_address or 'Unknown')
    get_user_or_ip.short_description = 'Посмотрел'
    
    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['total_views'] = VideoViewLog.objects.count()
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ['title', 'position', 'is_active']
    list_filter = ['position', 'is_active']
    search_fields = ['title', 'html_content']
    fields = ['title', 'position', 'is_active', 'image', 'html_content', 'link_url']