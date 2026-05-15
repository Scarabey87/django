from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('person/<int:pk>/all-videos/', views.person_all_videos, name='person_all_videos'),
    path('person/<int:pk>/watch/', views.person_first_video, name='person_first_video'),
    path('video/<int:pk>/', views.video_player, name='video_player'),
    
    # ✅ Опрос
    path('poll/submit/', views.submit_poll, name='submit_poll'),
    
    # ✅ Активация кода
    path('activate-code/', views.activate_code, name='activate_code'),
    
    # ✅ Админка
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # ✅ API
    path('api/manage-user/', views.manage_user_level, name='manage_user'),
    path('api/create-code/', views.create_code, name='create_code'),
    path('api/check-vip-status/', views.check_vip_status, name='check_vip_status'),
]