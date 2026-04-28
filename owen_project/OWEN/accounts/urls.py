from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('activate-code/', views.activate_code, name='activate_code'),
    path('profile/', views.login_view, name='profile'), # Заглушка, можно сделать отдельную view
]