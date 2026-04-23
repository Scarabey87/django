from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import CustomUserCreationForm, CustomAuthenticationForm


def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"✅ Регистрация успешна!")
            return redirect('home')
        else:
            messages.error(request, "Исправьте ошибки в форме")
    else:
        form = CustomUserCreationForm()
    return render(request, 'accounts/register.html', {'form': form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            user.check_vip_status()
            login(request, user)
            messages.success(request, f"✅ С возвращением, {user.username}!")
            return redirect(request.GET.get('next', 'home'))
        else:
            messages.error(request, "❌ Неверный логин, email или пароль")
    else:
        form = CustomAuthenticationForm()
    return render(request, 'accounts/login.html', {'form': form})


@login_required
def logout_view(request):
    logout(request)
    messages.info(request, "Вы вышли из аккаунта")
    return redirect('home')