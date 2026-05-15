from django.db import models
from accounts.models import User
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth


class Person(models.Model):
    name = models.CharField("Имя", max_length=100)
    description = models.TextField("Описание")
    photo = models.ImageField("Фото", upload_to='people/')
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def total_views(self):
        return sum(v.views for v in self.videos.all())

    @property
    def video_count(self):
        return self.videos.count()

    class Meta:
        verbose_name = "Человек"
        verbose_name_plural = "Люди"


class Video(models.Model):
    ACCESS_LEVELS = [('L1', 'Обычный (L1)'), ('L2', 'VIP (L2)')]
    
    person = models.ForeignKey(Person, related_name='videos', on_delete=models.CASCADE)
    title = models.CharField("Название", max_length=200)
    description = models.TextField("Описание", blank=True)
    video_file = models.FileField("Видео", upload_to='videos/')
    thumbnail = models.ImageField("Превью", upload_to='thumbnails/', blank=True, null=True)
    access_level = models.CharField("Уровень доступа", max_length=2, choices=ACCESS_LEVELS, default='L1')
    requires_code = models.BooleanField("Требуется код", default=False)
    views = models.PositiveIntegerField("Просмотры", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.person.name})"

    def increment_views(self):
        Video.objects.filter(pk=self.pk).update(views=models.F('views') + 1)
        self.refresh_from_db()
    
    @property
    def thumbnail_url_safe(self):
        if self.thumbnail and hasattr(self.thumbnail, 'url'):
            return self.thumbnail.url
        return ''

    class Meta:
        verbose_name = "Видео"
        verbose_name_plural = "Видео"
        ordering = ['-views', '-created_at']


class PollTag(models.Model):
    tag = models.CharField("Тег", max_length=100, unique=True)
    active_question = models.CharField("Активный вопрос", max_length=255, default="Предложите теги для оживления", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.tag
    
    @property
    def vote_count(self):
        return self.votes.count()
    
    def reset_votes_for_new_question(self, new_question):
        if self.active_question != new_question:
            self.active_question = new_question
            self.votes.all().delete()
            self.save()
            return True
        return False
    
    def get_cookie_name(self, request):
        import hashlib
        question_hash = hashlib.md5(self.active_question.encode()).hexdigest()[:8]
        return f"poll_voted_{self.id}_{question_hash}"
    
    class Meta:
        verbose_name = "Тег опроса"
        verbose_name_plural = "🎯 Теги опроса"
        ordering = ['-created_at']


class PollVote(models.Model):
    tag = models.ForeignKey(PollTag, related_name='votes', on_delete=models.CASCADE)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    ip_address = models.GenericIPAddressField("IP адрес", null=True, blank=True)
    question_snapshot = models.CharField("Вопрос на момент голоса", max_length=255, blank=True)
    voted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        if self.user:
            return f"{self.tag.tag} - 👤 {self.user.username}"
        return f"{self.tag.tag} - 🌐 {self.ip_address or 'Unknown'}"
    
    class Meta:
        verbose_name = "Голос"
        verbose_name_plural = "Голоса"
        ordering = ['-voted_at']
        constraints = [
            models.UniqueConstraint(fields=['tag', 'ip_address', 'question_snapshot'], name='unique_vote_per_ip_question', condition=models.Q(user__isnull=True)),
            models.UniqueConstraint(fields=['tag', 'user', 'question_snapshot'], name='unique_vote_per_user_question', condition=models.Q(user__isnull=False)),
        ]


class AccessCode(models.Model):
    code = models.CharField("Код", max_length=20, unique=True)
    duration_days = models.IntegerField("Длительность (дни)", default=5)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code
    
    def is_expired(self):
        if self.created_at:
            return timezone.now() > self.created_at + timedelta(days=self.duration_days)
        return True
    
    def save(self, *args, **kwargs):
        if self.pk and self.is_expired():
            if self.pk:
                self.__class__.objects.filter(pk=self.pk).delete()
                return
            self.is_active = False
        super().save(*args, **kwargs)
    
    @classmethod
    def cleanup_expired(cls):
        expired = cls.objects.filter(created_at__lt=timezone.now() - timedelta(days=30))
        count = expired.count()
        expired.delete()
        return count

    class Meta:
        verbose_name = "Код доступа"
        verbose_name_plural = "Коды доступа"


class CodeActivation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.ForeignKey(AccessCode, on_delete=models.CASCADE)
    activated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.expires_at and self.code:
            self.expires_at = self.activated_at + timedelta(days=self.code.duration_days)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.code.code}"

    def is_valid(self):
        return timezone.now() < self.expires_at if self.expires_at else False
    
    def is_expired(self):
        return timezone.now() >= self.expires_at if self.expires_at else True

    class Meta:
        verbose_name = "Активация"
        verbose_name_plural = "Активации кодов"


class SiteSettings(models.Model):
    """
    ✅ Настройки сайта: ТОЛЬКО ДОНАТ
    """
    donation_card = models.CharField("Номер счёта ЮMoney", max_length=50, default="4100119509404270")
    donation_card_alt = models.CharField("Номер карты (альтернатива)", max_length=50, default="5599 0021 3482 6538")
    donation_amount = models.IntegerField("Сумма доната (руб)", default=350)
    donation_days = models.IntegerField("Дней доступа за донат", default=5)
    donation_email = models.EmailField("Email для чеков", default="caravagio2323@gmail.com")
    
    updated_at = models.DateTimeField("Обновлено", auto_now=True)
    
    def __str__(self):
        return "⚙️ Настройки сайта"
    
    class Meta:
        verbose_name = "⚙️ Настройки сайта"
        verbose_name_plural = "⚙️ Настройки сайта"
    
    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
    
    def save(self, *args, **kwargs):
        self.pk = 1
        from django.core.cache import cache
        cache.delete('site_settings')
        cache.delete('donation_context')
        super().save(*args, **kwargs)
    
    @property
    def blur_css(self):
        """✅ ОРИГИНАЛЬНОЕ размытие превью"""
        return "blur(8px) brightness(0.6)"
    
    @property
    def blur_css_hover(self):
        """✅ ОРИГИНАЛЬНОЕ размытие при наведении"""
        return "blur(4px) brightness(0.8)"
    
    @classmethod
    def get_cached_settings(cls):
        from django.core.cache import cache
        settings = cache.get('site_settings')
        if settings is None:
            settings = cls.get_settings()
            cache.set('site_settings', settings, timeout=60)
        return settings


class VideoViewLog(models.Model):
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='view_logs')
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    ip_address = models.GenericIPAddressField("IP адрес", null=True, blank=True)
    viewed_at = models.DateTimeField("Время просмотра", auto_now_add=True)
    
    class Meta:
        verbose_name = "Просмотр видео"
        verbose_name_plural = "📊 Логи просмотров видео"
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['viewed_at']),
            models.Index(fields=['video', 'viewed_at']),
        ]
    
    @classmethod
    def record_view(cls, video, request):
        try:
            return cls.objects.create(
                video=video,
                user=request.user if request.user.is_authenticated else None,
                ip_address=request.META.get('REMOTE_ADDR')
            )
        except:
            return None
    
    @classmethod
    def get_stats_by_period(cls, video=None, period='day', days=365):
        since = timezone.now() - timedelta(days=days)
        qs = cls.objects.filter(viewed_at__gte=since)
        
        if video:
            qs = qs.filter(video=video)
        
        trunc_map = {
            'day': TruncDate('viewed_at'),
            'week': TruncWeek('viewed_at'),
            'month': TruncMonth('viewed_at'),
        }
        trunc_func = trunc_map.get(period, TruncDate('viewed_at'))
        
        stats = qs.annotate(
            period=trunc_func
        ).values('period').annotate(
            count=Count('id')
        ).order_by('period')
        
        return list(stats)


class SiteVisit(models.Model):
    ip_address = models.GenericIPAddressField("IP адрес", null=True, blank=True)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, verbose_name="Пользователь")
    page = models.CharField("Страница", max_length=255, blank=True)
    visited_at = models.DateTimeField("Время посещения", auto_now_add=True)
    user_agent = models.CharField("User Agent", max_length=500, blank=True)
    
    class Meta:
        verbose_name = "Посещение"
        verbose_name_plural = "📊 Посещения сайта"
        ordering = ['-visited_at']
        indexes = [
            models.Index(fields=['visited_at']),
            models.Index(fields=['page', 'visited_at']),
        ]
    
    @classmethod
    def record_visit(cls, request, page=''):
        try:
            return cls.objects.create(
                ip_address=request.META.get('REMOTE_ADDR'),
                user=request.user if request.user.is_authenticated else None,
                page=page,
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
            )
        except:
            return None
    
    @classmethod
    def get_stats_by_period(cls, period='day', days=365, page_filter=None):
        since = timezone.now() - timedelta(days=days)
        qs = cls.objects.filter(visited_at__gte=since)
        
        if page_filter:
            qs = qs.filter(page__icontains=page_filter)
        
        trunc_map = {
            'day': TruncDate('visited_at'),
            'week': TruncWeek('visited_at'),
            'month': TruncMonth('visited_at'),
        }
        trunc_func = trunc_map.get(period, TruncDate('visited_at'))
        
        stats = qs.annotate(
            period=trunc_func
        ).values('period').annotate(
            count=Count('id')
        ).order_by('period')
        
        return list(stats)
    
    @classmethod
    def get_summary_stats(cls, days=7):
        since = timezone.now() - timedelta(days=days)
        
        return {
            'total': cls.objects.filter(visited_at__gte=since).count(),
            'unique_users': cls.objects.filter(visited_at__gte=since, user__isnull=False).values('user').distinct().count(),
            'unique_ips': cls.objects.filter(visited_at__gte=since).values('ip_address').distinct().count(),
            'by_day': cls.get_stats_by_period(period='day', days=days),
            'by_week': cls.get_stats_by_period(period='week', days=days*4),
            'by_month': cls.get_stats_by_period(period='month', days=365),
        }


class Advertisement(models.Model):
    POSITION_CHOICES = [('left', 'Левая колонка'), ('right', 'Правая колонка')]
    
    title = models.CharField("Название", max_length=100, blank=True)
    image = models.ImageField("Изображение", upload_to='ads/', blank=True, null=True)
    html_content = models.TextField("HTML контент", blank=True)
    link_url = models.URLField("Ссылка", blank=True)
    position = models.CharField("Позиция", max_length=10, choices=POSITION_CHOICES, default='left')
    is_active = models.BooleanField("Активна", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Реклама {self.position} - {self.title or 'Без названия'}"

    class Meta:
        verbose_name = "Рекламный блок"
        verbose_name_plural = "Рекламные блоки"