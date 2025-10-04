from rest_framework import serializers
from .models import Company, User, Expense, ApprovalRule, Approval


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'country', 'default_currency', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source='manager.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'role', 'manager', 'manager_name', 
            'company', 'company_name', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'password': {'write_only': True}}


class ApprovalRuleSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = ApprovalRule
        fields = [
            'id', 'company', 'company_name', 'name', 'description', 'approvers',
            'min_percentage_required', 'specific_approver', 'is_hybrid_rule',
            'min_amount', 'max_amount', 'categories', 'departments', 'is_active',
            'priority', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.name', read_only=True)
    expense_reference = serializers.CharField(source='expense.reference_number', read_only=True)
    
    class Meta:
        model = Approval
        fields = [
            'id', 'expense', 'expense_reference', 'approver', 'approver_name',
            'status', 'comment', 'timestamp', 'approval_order', 'is_final_approval'
        ]
        read_only_fields = ['id', 'timestamp']


class ExpenseSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    current_approver_name = serializers.CharField(source='current_approver.name', read_only=True)
    approval_rule_name = serializers.CharField(source='approval_rule.name', read_only=True)
    approvals = ApprovalSerializer(many=True, read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id', 'owner', 'owner_name', 'amount', 'currency', 'description',
            'date', 'receipt_url', 'receipt_file', 'category', 'status',
            'approval_chain', 'current_approver', 'current_approver_name',
            'approval_rule', 'approval_rule_name', 'submitted_at', 'approved_at',
            'paid_at', 'notes', 'reference_number', 'approvals', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reference_number', 'submitted_at', 'approved_at', 
            'paid_at', 'created_at', 'updated_at'
        ]


class ExpenseCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating expenses"""
    
    class Meta:
        model = Expense
        fields = [
            'amount', 'currency', 'description', 'date', 'receipt_url', 
            'receipt_file', 'category', 'notes'
        ]
    
    def create(self, validated_data):
        # Set owner to current user
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)