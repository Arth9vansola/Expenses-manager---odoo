from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .authentication import SignupView, LoginView, LogoutView, UserManagementView, UserDetailView
from .expense_api import ExpenseSubmissionView, ExpenseListView, ExpenseDetailView

router = DefaultRouter()
router.register(r'companies', views.CompanyViewSet)
router.register(r'users', views.UserViewSet)
router.register(r'expenses', views.ExpenseViewSet)
router.register(r'approval-rules', views.ApprovalRuleViewSet)
router.register(r'approvals', views.ApprovalViewSet)

urlpatterns = [
    # Authentication endpoints
    path('api/signup/', SignupView.as_view(), name='signup'),
    path('api/login/', LoginView.as_view(), name='login'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    
    # User management endpoints
    path('api/users/', UserManagementView.as_view(), name='user-management'),
    path('api/users/<uuid:user_id>/', UserDetailView.as_view(), name='user-detail'),
    
    # Expense submission and management endpoints
    path('api/expenses/submit/', ExpenseSubmissionView.as_view(), name='expense-submit'),
    path('api/expenses/list/', ExpenseListView.as_view(), name='expense-list'),
    path('api/expenses/<uuid:user_id>/', ExpenseDetailView.as_view(), name='expense-detail'),
    path('api/expenses/my/', ExpenseDetailView.as_view(), name='my-expenses'),
    
    # API router
    path('api/', include(router.urls)),
]