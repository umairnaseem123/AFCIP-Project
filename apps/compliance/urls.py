from rest_framework.routers import DefaultRouter
from .views import SARReportViewSet, CTRReportViewSet, StructuringAlertViewSet

router = DefaultRouter()
router.register('sar', SARReportViewSet, basename='sar')
router.register('ctr', CTRReportViewSet, basename='ctr')
router.register('structuring-alerts', StructuringAlertViewSet, basename='structuring')
urlpatterns = router.urls
