from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from .models import User


class CustomUserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="Пароль", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Подтверждение пароля", widget=forms.PasswordInput)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'full_name')
    
    def clean_password2(self):
        p1 = self.cleaned_data.get('password1')
        p2 = self.cleaned_data.get('password2')
        if p1 and p2 and p1 != p2:
            raise ValidationError("Пароли не совпадают")
        return p2
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
        return user


class CustomAuthenticationForm(AuthenticationForm):
    username = forms.CharField(
        label="Логин или Email",
        widget=forms.TextInput(attrs={'autofocus': True})
    )
    password = forms.CharField(
        label="Пароль",
        widget=forms.PasswordInput
    )
    
    def clean_username(self):
        username_or_email = self.cleaned_data.get('username')
        if '@' in username_or_email:
            try:
                user = User.objects.get(email__iexact=username_or_email)
                return user.username
            except User.DoesNotExist:
                raise ValidationError("Пользователь с таким email не найден")
        return username_or_email
    
    def clean(self):
        username = self.cleaned_data.get('username')
        password = self.cleaned_data.get('password')
        if username and password:
            self.user_cache = authenticate(self.request, username=username, password=password)
            if self.user_cache is None:
                raise ValidationError("Неверный логин, email или пароль", code='invalid_login')
        return self.cleaned_data