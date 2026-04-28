from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib import messages
from .models import User
from content.models import AccessCode, CodeActivation
from django.utils import timezone
from datetime import timedelta
import json

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.full_name = request.POST.get('full_name', '')
            user.save()
            login(request, user)
            return redirect('home')
    else:
        form = UserCreationForm()
    return render(request, 'accounts/register.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            user.check_vip_status() # Проверка истечения VIP при входе
            login(request, user)
            return redirect('home')
    else:
        form = AuthenticationForm()
    return render(request, 'accounts/login.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('login')

def activate_code(request):
    if request.method == 'POST':
        code_str = request.POST.get('code')
        try:
            access_code = AccessCode.objects.get(code=code_str, is_active=True)
            
            # Создаем активацию
            activation = CodeActivation.objects.create(
                user=request.user,
                code=access_code,
                expires_at=timezone.now() + timedelta(hours=access_code.duration_hours)
            )
            
            # Обновляем пользователя
            request.user.is_vip = True
            request.user.vip_expires_at = activation.expires_at
            request.user.save()
            
            messages.success(request, "VIP доступ активирован!")
        except AccessCode.DoesNotExist:
            messages.error(request, "Неверный или неактивный код.")
            
    return redirect('profile') # Или туда, откуда пришел запрос