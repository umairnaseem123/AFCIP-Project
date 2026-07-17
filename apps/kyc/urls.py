from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KYCProfileViewSet

router = DefaultRouter()
router.register(r'', KYCProfileViewSet, basename='kyc')

urlpatterns = [
    path('', include(router.urls)),
]
