from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .authentication import SignupView, LoginView, LogoutView, UserManagementView, UserDetailView
from .expense_api import ExpenseSubmissionView, ExpenseListView, ExpenseDetailView
from .approval_api import PendingApprovalsView, ExpenseReviewView, ApprovalHistoryView, ApprovalRulesView
from .approval_rule_api import (
    ApprovalRuleListCreateView,
    ApprovalRuleDetailView, 
    ApprovalRuleBulkOperationsView,
    ApprovalRuleValidationView
)

# Import currency and OCR API views
from .currency_ocr_api import (
    get_countries_and_currencies,
    get_exchange_rate,
    convert_currency,
    get_multiple_exchange_rates,
    extract_receipt_text,
    extract_expense_data,
    get_ocr_providers,
    clear_currency_cache,
    get_service_status
)

# Step 16: Import secure API endpoints with permissions and validation
from .secure_user_api import (
    users_list_create,
    user_detail,
    user_roles,
    current_user_profile
)
from .secure_expense_api import (
    expenses_list_create,
    expense_detail,
    submit_expense,
    approve_expense,
    reject_expense
)
from .secure_approval_rules_api import (
    approval_rules_list_create,
    approval_rule_detail,
    validate_approval_rule,
    approval_rule_templates
)

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
    
    # Approval workflow endpoints
    path('api/approvals/<uuid:approver_id>/', PendingApprovalsView.as_view(), name='pending-approvals'),
    path('api/approvals/<uuid:expense_id>/review/', ExpenseReviewView.as_view(), name='expense-review'),
    path('api/expenses/<uuid:expense_id>/approval-history/', ApprovalHistoryView.as_view(), name='approval-history'),
    path('api/approval-rules/', ApprovalRulesView.as_view(), name='approval-rules-list'),
    
    # Step 14: Approval Rule Configuration API endpoints
    path('api/approval-rules/management/', ApprovalRuleListCreateView.as_view(), name='approval-rules-management'),
    path('api/approval-rules/management/<uuid:rule_id>/', ApprovalRuleDetailView.as_view(), name='approval-rule-detail'),
    path('api/approval-rules/bulk/', ApprovalRuleBulkOperationsView.as_view(), name='approval-rules-bulk'),
    path('api/approval-rules/validate/', ApprovalRuleValidationView.as_view(), name='approval-rules-validate'),
    
    # Step 15: Currency Integration APIs
    path('api/currencies/countries/', get_countries_and_currencies, name='currencies-countries'),
    path('api/currencies/exchange-rate/', get_exchange_rate, name='currency-exchange-rate'),
    path('api/currencies/convert/', convert_currency, name='currency-convert'),
    path('api/currencies/exchange-rates/', get_multiple_exchange_rates, name='currency-multiple-rates'),
    path('api/currencies/cache/', clear_currency_cache, name='currency-clear-cache'),
    
    # Step 15: OCR Integration APIs
    path('api/ocr/extract-text/', extract_receipt_text, name='ocr-extract-text'),
    path('api/ocr/extract-expense/', extract_expense_data, name='ocr-extract-expense'),
    path('api/ocr/providers/', get_ocr_providers, name='ocr-providers'),
    
    # Step 15: Integration Service Status
    path('api/integrations/status/', get_service_status, name='integrations-status'),
    
    # Step 16: Secure User Management API with Permissions
    path('api/secure/users/', users_list_create, name='secure-users-list-create'),
    path('api/secure/users/<uuid:pk>/', user_detail, name='secure-user-detail'),
    path('api/secure/users/roles/', user_roles, name='secure-user-roles'),
    path('api/secure/users/profile/', current_user_profile, name='secure-current-user-profile'),
    
    # Step 16: Secure Expense Management API with Permissions
    path('api/secure/expenses/', expenses_list_create, name='secure-expenses-list-create'),
    path('api/secure/expenses/<uuid:pk>/', expense_detail, name='secure-expense-detail'),
    path('api/secure/expenses/<uuid:pk>/submit/', submit_expense, name='secure-expense-submit'),
    path('api/secure/expenses/<uuid:pk>/approve/', approve_expense, name='secure-expense-approve'),
    path('api/secure/expenses/<uuid:pk>/reject/', reject_expense, name='secure-expense-reject'),
    
    # Step 16: Secure Approval Rules Management API with Permissions
    path('api/secure/approval-rules/', approval_rules_list_create, name='secure-approval-rules-list-create'),
    path('api/secure/approval-rules/<uuid:pk>/', approval_rule_detail, name='secure-approval-rule-detail'),
    path('api/secure/approval-rules/validate/', validate_approval_rule, name='secure-approval-rule-validate'),
    path('api/secure/approval-rules/templates/', approval_rule_templates, name='secure-approval-rule-templates'),
    
    # API router
    path('api/', include(router.urls)),
]