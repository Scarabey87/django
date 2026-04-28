from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('person/<int:pk>/', views.person_detail, name='person_detail'),
    path('video/<int:pk>/', views.video_player, name='video_player'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('api/manage-user/', views.manage_user_level, name='manage_user'),
    path('api/create-code/', views.create_code, name='create_code'),
]