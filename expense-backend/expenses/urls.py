from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'companies', views.CompanyViewSet)
router.register(r'users', views.UserViewSet)
router.register(r'approval-rules', views.ApprovalRuleViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'approvals', views.ApprovalViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]