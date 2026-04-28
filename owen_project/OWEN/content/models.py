from django.db import models
from accounts.models import User
import uuid

class Person(models.Model):
    name = models.CharField("Имя", max_length=100)
    description = models.TextField("Описание")
    category = models.CharField("Категория", max_length=50)
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

class Video(models.Model):
    ACCESS_LEVELS = [
        ('L1', 'Обычный (L1)'),
        ('L2', 'VIP (L2)'),
    ]
    
    person = models.ForeignKey(Person, related_name='videos', on_delete=models.CASCADE)
    title = models.CharField("Название", max_length=200)
    description = models.TextField("Описание", blank=True)
    video_file = models.FileField("Видео", upload_to='videos/')
    thumbnail = models.ImageField("Превью", upload_to='thumbnails/')
    access_level = models.CharField("Уровень доступа", max_length=2, choices=ACCESS_LEVELS, default='L1')
    requires_code = models.BooleanField("Требуется код", default=False)
    views = models.PositiveIntegerField("Просмотры", default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def increment_views(self):
        self.views += 1
        self.save()

class AccessCode(models.Model):
    code = models.CharField("Код", max_length=20, unique=True)
    duration_hours = models.IntegerField("Длительность (часы)", default=24)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code

class CodeActivation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.ForeignKey(AccessCode, on_delete=models.CASCADE)
    activated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = self.activated_at + timedelta(hours=self.code.duration_hours)
        super().save(*args, **kwargs)

class Advertisement(models.Model):
    POSITION_CHOICES = [
        ('left', 'Левая колонка'),
        ('right', 'Правая колонка'),
    ]
    
    title = models.CharField("Название", max_length=100, blank=True)
    image = models.ImageField("Изображение", upload_to='ads/', blank=True, null=True)
    html_content = models.TextField("HTML контент", blank=True, help_text="Можно вставить HTML код рекламы")
    link_url = models.URLField("Ссылка", blank=True, help_text="Куда ведет клик по рекламе")
    position = models.CharField("Позиция", max_length=10, choices=POSITION_CHOICES, default='left')
    is_active = models.BooleanField("Активна", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Реклама {self.position} - {self.title or 'Без названия'}"

    class Meta:
        verbose_name = "Рекламный блок"
        verbose_name_plural = "Рекламные блоки"