from django.urls import path

from . import views

urlpatterns = [
	path('', views.index,name="index"),
	path('main.css', views.maincss),
	path('<str:name>', views.static_files)
]