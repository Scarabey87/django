from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from .models import Person, Video, AccessCode, CodeActivation, Advertisement
from accounts.models import User
from django.utils import timezone
from datetime import timedelta
import json

def home(request):
    people = Person.objects.filter(is_active=True)
    # Получаем активные рекламные блоки
    left_ads = Advertisement.objects.filter(position='left', is_active=True)[:2]
    right_ads = Advertisement.objects.filter(position='right', is_active=True)[:2]
    
    return render(request, 'content/home.html', {
        'people': people,
        'left_ads': left_ads,
        'right_ads': right_ads
    })

def person_detail(request, pk):
    person = get_object_or_404(Person, pk=pk)
    videos = person.videos.all()
    return render(request, 'content/person_detail.html', {'person': person, 'videos': videos})

def video_player(request, pk):
    video = get_object_or_404(Video, pk=pk)
    user = request.user if request.user.is_authenticated else None
    
    can_watch = False
    blocked_reason = None

    # Логика доступа
    if video.access_level == 'L1':
        can_watch = True
    else: # L2
        if user and user.is_authenticated:
            user.check_vip_status()
            if user.is_vip:
                can_watch = True
            elif video.requires_code:
                 # Проверка активной активации кода
                active_activation = CodeActivation.objects.filter(
                    user=user, 
                    expires_at__gt=timezone.now()
                ).first()
                if active_activation:
                    can_watch = True
                else:
                    blocked_reason = "Требуется активный код доступа"
            else:
                blocked_reason = "Требуется VIP статус"
        else:
            blocked_reason = "Требуется вход в систему"

    if can_watch:
        video.increment_views()

    return render(request, 'content/video_player.html', {
        'video': video, 
        'can_watch': can_watch, 
        'blocked_reason': blocked_reason
    })

@login_required
def dashboard(request):
    if not request.user.is_superuser:
        return redirect('home')
    
    users = User.objects.all()
    people = Person.objects.all()
    videos = Video.objects.all()
    codes = AccessCode.objects.all()
    
    stats = {
        'users_count': users.count(),
        'people_count': people.count(),
        'videos_count': videos.count(),
        'total_views': sum(v.views for v in videos)
    }
    
    return render(request, 'content/dashboard.html', {
        'users': users, 'people': people, 'videos': videos, 
        'codes': codes, 'stats': stats
    })

@login_required
@require_POST
def manage_user_level(request):
    if not request.user.is_superuser:
        return JsonResponse({'error': 'Forbidden'}, status=403)
    
    data = json.loads(request.body)
    user_id = data.get('user_id')
    level = data.get('level') # 'L1' or 'L2'
    hours = data.get('hours', 0)
    
    try:
        target_user = User.objects.get(id=user_id)
        if level == 'L2':
            target_user.is_vip = True
            target_user.vip_expires_at = timezone.now() + timedelta(hours=int(hours))
        else:
            target_user.is_vip = False
            target_user.vip_expires_at = None
        target_user.save()
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_POST
def create_code(request):
    if not request.user.is_superuser:
        return JsonResponse({'error': 'Forbidden'}, status=403)
    
    data = json.loads(request.body)
    code_str = data.get('code')
    duration = data.get('duration', 24)
    
    try:
        AccessCode.objects.create(code=code_str, duration_hours=duration)
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)