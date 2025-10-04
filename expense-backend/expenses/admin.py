from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Company, User, Expense, ApprovalRule, Approval


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'country', 'default_currency', 'is_active', 'created_at']
    list_filter = ['country', 'default_currency', 'is_active']
    search_fields = ['name', 'country']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['name', 'email', 'role', 'company', 'manager', 'is_active']
    list_filter = ['role', 'company', 'is_active']
    search_fields = ['name', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_login_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('name', 'role', 'manager', 'company')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login_at', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'role', 'company', 'manager', 'password1', 'password2'),
        }),
    )
    
    ordering = ('name',)


@admin.register(ApprovalRule)
class ApprovalRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_active', 'priority', 'min_percentage_required', 'created_at']
    list_filter = ['company', 'is_active', 'is_hybrid_rule']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'company', 'is_active', 'priority')
        }),
        ('Approval Configuration', {
            'fields': ('approvers', 'min_percentage_required', 'specific_approver', 'is_hybrid_rule')
        }),
        ('Rule Conditions', {
            'fields': ('min_amount', 'max_amount', 'categories', 'departments'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'owner', 'amount', 'currency', 'status', 'current_approver', 'date']
    list_filter = ['status', 'currency', 'category', 'owner__company']
    search_fields = ['reference_number', 'description', 'owner__name', 'owner__email']
    readonly_fields = ['id', 'reference_number', 'created_at', 'updated_at', 'submitted_at', 'approved_at', 'paid_at']
    date_hierarchy = 'date'
    
    fieldsets = (
        ('Expense Details', {
            'fields': ('owner', 'amount', 'currency', 'description', 'date', 'category')
        }),
        ('Attachments', {
            'fields': ('receipt_url', 'receipt_file'),
            'classes': ('collapse',)
        }),
        ('Approval Workflow', {
            'fields': ('status', 'approval_rule', 'approval_chain', 'current_approver')
        }),
        ('Additional Information', {
            'fields': ('notes', 'reference_number'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('submitted_at', 'approved_at', 'paid_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ['expense', 'approver', 'status', 'approval_order', 'is_final_approval', 'timestamp']
    list_filter = ['status', 'is_final_approval', 'expense__owner__company']
    search_fields = ['expense__reference_number', 'approver__name', 'approver__email', 'comment']
    readonly_fields = ['id', 'timestamp']
    
    fieldsets = (
        ('Approval Information', {
            'fields': ('expense', 'approver', 'status', 'comment')
        }),
        ('Workflow Details', {
            'fields': ('approval_order', 'is_final_approval', 'timestamp')
        }),
    )
