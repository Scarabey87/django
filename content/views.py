from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib import messages
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Sum, Q
import json
import hashlib

from .models import (
    Person, Video, AccessCode, CodeActivation, Advertisement, 
    PollTag, PollVote, SiteVisit, SiteSettings, VideoViewLog
)
from accounts.models import User


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')


def get_rate_limit_key(request, action):
    ip = get_client_ip(request)
    user_id = request.user.id if request.user.is_authenticated else None
    key_base = f"{action}:{ip}:{user_id}"
    return hashlib.md5(key_base.encode()).hexdigest()


def check_rate_limit(request, action, max_attempts=5, window_minutes=15):
    try:
        key = f"rate_limit:{get_rate_limit_key(request, action)}"
        attempts = cache.get(key, 0)
        if attempts >= max_attempts:
            ttl = cache.ttl(key)
            reset_time = timezone.now() + timedelta(seconds=ttl) if ttl else None
            return False, 0, reset_time
        cache.set(key, attempts + 1, timeout=window_minutes * 60)
        remaining = max_attempts - attempts - 1
        return True, remaining, None
    except:
        return True, 5, None


def get_vip_context(request):
    user = request.user if request.user.is_authenticated else None
    user_has_vip = False
    vip_time_left = None
    
    if user:
        user.check_vip_status()
        user_has_vip = user.is_vip
        if not user_has_vip:
            active = CodeActivation.objects.filter(user=user, expires_at__gt=timezone.now()).first()
            if active:
                user_has_vip = True
                vip_time_left = active.expires_at
        if user_has_vip and user.vip_expires_at:
            vip_time_left = user.vip_expires_at
    
    return {'user_has_vip': user_has_vip, 'vip_time_left': vip_time_left, 'user': user}


def get_donation_context():
    from django.core.cache import cache
    cache.delete('site_settings')
    cache.delete('donation_context')
    
    settings = SiteSettings.get_settings()
    
    return {
        'donation_card': settings.donation_card,
        'donation_card_alt': settings.donation_card_alt,
        'donation_amount': settings.donation_amount,
        'donation_days': settings.donation_days,
        'donation_email': settings.donation_email,
    }


def get_site_settings_context():
    settings = SiteSettings.get_settings()
    return {
        'vip_blur_css': settings.blur_css,
        'vip_blur_css_hover': settings.blur_css_hover,
    }


def home(request):
    SiteVisit.record_visit(request, page='/')
    
    people = Person.objects.filter(is_active=True)
    left_ads = Advertisement.objects.filter(position='left', is_active=True)[:2]
    right_ads = Advertisement.objects.filter(position='right', is_active=True)[:2]
    vip_context = get_vip_context(request)
    donation_context = get_donation_context()
    settings_context = get_site_settings_context()
    
    return render(request, 'content/home.html', {
        'people': people, 'left_ads': left_ads, 'right_ads': right_ads,
        **vip_context, **donation_context, **settings_context
    })


def person_first_video(request, pk):
    person = get_object_or_404(Person, pk=pk)
    return redirect('person_all_videos', pk=pk)


def person_all_videos(request, pk):
    SiteVisit.record_visit(request, page=f'/person/{pk}/all-videos/')
    
    person = get_object_or_404(Person, pk=pk)
    videos = person.videos.all().order_by('-created_at')
    
    for video in videos:
        VideoViewLog.record_view(video, request)
        video.increment_views()
    
    vip_context = get_vip_context(request)
    settings_context = get_site_settings_context()
    donation_context = get_donation_context()
    
    return render(request, 'content/person_all_videos.html', {
        'person': person, 'videos': videos, 
        **vip_context, **settings_context, **donation_context
    })


def video_player(request, pk):
    video = get_object_or_404(Video, pk=pk)
    return redirect('person_all_videos', pk=video.person.pk)


@require_POST
def submit_poll(request):
    try:
        tag_name = request.POST.get('tag', '').strip()
        current_question = request.POST.get('question', '').strip() or "Предложите теги для оживления"
        
        if not tag_name or len(tag_name) < 2:
            return JsonResponse({'error': 'Тег слишком короткий (мин. 2 символа)'}, status=400)
        
        tag, created = PollTag.objects.get_or_create(tag=tag_name)
        
        if current_question and tag.active_question != current_question:
            tag.reset_votes_for_new_question(current_question)
        
        cookie_name = tag.get_cookie_name(request)
        if request.COOKIES.get(cookie_name) == 'voted':
            return JsonResponse({'error': 'Вы уже голосовали в этой сессии', 'total_votes': tag.vote_count}, status=400)
        
        user = request.user if request.user.is_authenticated else None
        ip_address = get_client_ip(request) if not user else None
        
        if user:
            if PollVote.objects.filter(tag=tag, user=user, question_snapshot=tag.active_question).exists():
                return JsonResponse({'error': 'Вы уже голосовали за этот вопрос', 'total_votes': tag.vote_count}, status=400)
        else:
            if ip_address and PollVote.objects.filter(tag=tag, ip_address=ip_address, question_snapshot=tag.active_question).exists():
                return JsonResponse({'error': 'Вы уже голосовали за этот вопрос', 'total_votes': tag.vote_count}, status=400)
        
        PollVote.objects.create(
            tag=tag, user=user, ip_address=ip_address,
            question_snapshot=tag.active_question
        )
        
        response = JsonResponse({
            'status': 'success',
            'message': f'✅ Голос принят! Всего: {tag.vote_count}',
            'total_votes': tag.vote_count,
            'tag': tag_name,
            'question': tag.active_question
        })
        response.set_cookie(cookie_name, 'voted', max_age=86400, httponly=True, samesite='Lax')
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': f'Ошибка сервера: {str(e)}'}, status=500)


@login_required
@require_POST
def activate_code(request):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    allowed, remaining, reset_time = check_rate_limit(request, 'activate_code', max_attempts=5, window_minutes=15)
    
    if not allowed:
        reset_minutes = int((reset_time - timezone.now()).total_seconds() / 60) if reset_time else 15
        error_msg = f'Слишком много попыток. Попробуйте через {reset_minutes} мин.'
        if is_ajax:
            return JsonResponse({'error': error_msg}, status=429)
        messages.error(request, error_msg)
        return redirect(request.META.get('HTTP_REFERER', 'home'))
    
    code_str = request.POST.get('code', '').strip().upper()
    
    if not code_str:
        error_msg = 'Введите код активации'
        if is_ajax:
            return JsonResponse({'error': error_msg}, status=400)
        messages.error(request, error_msg)
        return redirect(request.META.get('HTTP_REFERER', 'home'))
    
    try:
        access_code = AccessCode.objects.get(code=code_str, is_active=True)
        
        if access_code.is_expired():
            access_code.delete()
            error_msg = 'Срок действия кода истёк'
            if is_ajax:
                return JsonResponse({'error': error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect(request.META.get('HTTP_REFERER', 'home'))
        
        if CodeActivation.objects.filter(user=request.user, code=access_code).exists():
            error_msg = 'Вы уже активировали этот код'
            if is_ajax:
                return JsonResponse({'error': error_msg}, status=400)
            messages.error(request, error_msg)
            return redirect(request.META.get('HTTP_REFERER', 'home'))
        
        activation = CodeActivation.objects.create(
            user=request.user, code=access_code,
            expires_at=timezone.now() + timedelta(days=access_code.duration_days)
        )
        
        request.user.is_vip = True
        request.user.vip_expires_at = activation.expires_at
        request.user.save()
        access_code.delete()
        
        success_msg = f'✅ VIP доступ активирован на {access_code.duration_days} дней!'
        if is_ajax:
            return JsonResponse({
                'status': 'success',
                'message': success_msg,
                'expires_at': activation.expires_at.isoformat()
            })
        messages.success(request, success_msg)
        return redirect(request.META.get('HTTP_REFERER', 'home'))
        
    except AccessCode.DoesNotExist:
        AccessCode.objects.filter(code=code_str, created_at__lt=timezone.now() - timedelta(days=30)).delete()
        error_msg = 'Неверный код активации'
        if is_ajax:
            return JsonResponse({'error': error_msg}, status=400)
        messages.error(request, error_msg)
        return redirect(request.META.get('HTTP_REFERER', 'home'))
        
    except Exception as e:
        error_msg = f'Ошибка: {str(e)}'
        if is_ajax:
            return JsonResponse({'error': error_msg}, status=500)
        messages.error(request, error_msg)
        return redirect(request.META.get('HTTP_REFERER', 'home'))


@login_required
def dashboard(request):
    if not request.user.is_superuser:
        return redirect('home')
    
    users = User.objects.all()
    people = Person.objects.all()
    videos = Video.objects.all()
    
    CodeActivation.objects.filter(expires_at__lt=timezone.now()).delete()
    expired_codes = AccessCode.objects.filter(created_at__lt=timezone.now() - timedelta(days=30))
    expired_codes.delete()
    
    codes = AccessCode.objects.all()
    
    visit_summary = SiteVisit.get_summary_stats(days=7)
    top_videos = Video.objects.select_related('person').order_by('-views')[:10]
    total_visits = SiteVisit.objects.count()
    
    stats = {
        'total_users': users.count(),
        'active_users': users.filter(last_login__gte=timezone.now() - timedelta(days=7)).count(),
        'new_users_today': users.filter(date_joined__date=timezone.now().date()).count(),
        'total_videos': videos.count(),
        'total_views': Video.objects.aggregate(total=Sum('views'))['total'] or 0,
        'vip_videos': videos.filter(access_level='L2').count(),
        'poll_tags': PollTag.objects.count(),
        'poll_votes': PollVote.objects.count(),
        'total_visits': total_visits,
        'visits_today': SiteVisit.objects.filter(visited_at__date=timezone.now().date()).count(),
        'visits_week': SiteVisit.objects.filter(visited_at__gte=timezone.now() - timedelta(days=7)).count(),
        'visits_month': SiteVisit.objects.filter(visited_at__gte=timezone.now() - timedelta(days=30)).count(),
        'visits_by_day': visit_summary['by_day'],
        'visits_by_week': visit_summary['by_week'],
        'visits_by_month': visit_summary['by_month'],
        'top_videos': top_videos,
    }
    
    return render(request, 'content/dashboard.html', {
        'users': users, 'people': people, 'videos': videos, 'codes': codes, 'stats': stats
    })


@login_required
@require_POST
def manage_user_level(request):
    if not request.user.is_superuser:
        return JsonResponse({'error': 'Forbidden'}, status=403)
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        level = data.get('level')
        days = data.get('days', 5)
        target_user = User.objects.get(id=user_id)
        if level == 'L2':
            target_user.is_vip = True
            target_user.vip_expires_at = timezone.now() + timedelta(days=int(days))
        else:
            target_user.is_vip = False
            target_user.vip_expires_at = None
            CodeActivation.objects.filter(user=target_user).delete()
        target_user.save()
        return JsonResponse({'status': 'success'})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_POST
def create_code(request):
    if not request.user.is_superuser:
        return JsonResponse({'error': 'Forbidden'}, status=403)
    try:
        data = json.loads(request.body)
        code_str = data.get('code')
        duration = data.get('duration', 5)
        if len(code_str) < 6:
            return JsonResponse({'error': 'Код минимум 6 символов'}, status=400)
        if AccessCode.objects.filter(code=code_str).exists():
            return JsonResponse({'error': 'Код уже существует'}, status=400)
        AccessCode.objects.create(code=code_str, duration_days=duration)
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def check_vip_status(request):
    user = request.user
    user.check_vip_status()
    user_has_vip = user.is_vip
    vip_time_left = None
    if user_has_vip and user.vip_expires_at:
        vip_time_left = user.vip_expires_at.isoformat()
    elif not user_has_vip:
        active = CodeActivation.objects.filter(user=user, expires_at__gt=timezone.now()).first()
        if active:
            user_has_vip = True
            vip_time_left = active.expires_at.isoformat()
    return JsonResponse({
        'is_vip': user_has_vip,
        'vip_expires_at': vip_time_left,
        'needs_reload': user_has_vip == False and vip_time_left is None
    })