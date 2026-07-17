"""Transaction URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet, TransactionNetworkView

router = DefaultRouter()
router.register(r'', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('network/', TransactionNetworkView.as_view(), name='transaction-network'),
    path('', include(router.urls)),
]
