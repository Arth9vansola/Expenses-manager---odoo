from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from .models import Company, User, Expense, ApprovalRule, Approval
from .serializers import (
    CompanySerializer, UserSerializer, ExpenseSerializer, 
    ApprovalRuleSerializer, ApprovalSerializer, ExpenseCreateSerializer
)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Company.objects.all()
        return Company.objects.filter(id=user.company.id)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return User.objects.filter(company=user.company)
        elif user.role == 'manager':
            # Managers can see their direct reports and themselves
            return User.objects.filter(
                Q(company=user.company) & 
                (Q(manager=user) | Q(id=user.id))
            )
        else:
            # Employees can only see themselves
            return User.objects.filter(id=user.id)


class ApprovalRuleViewSet(viewsets.ModelViewSet):
    queryset = ApprovalRule.objects.all()
    serializer_class = ApprovalRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return ApprovalRule.objects.filter(company=user.company)
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ExpenseCreateSerializer
        return ExpenseSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            # Admins can see all expenses in their company
            return Expense.objects.filter(owner__company=user.company)
        elif user.role == 'manager':
            # Managers can see expenses from their direct reports and their own
            return Expense.objects.filter(
                Q(owner__company=user.company) & 
                (Q(owner__manager=user) | Q(owner=user) | Q(current_approver=user))
            )
        else:
            # Employees can only see their own expenses
            return Expense.objects.filter(owner=user)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit expense for approval"""
        expense = self.get_object()
        
        if expense.owner != request.user:
            return Response(
                {'error': 'You can only submit your own expenses'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if expense.status != 'draft':
            return Response(
                {'error': 'Only draft expenses can be submitted'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find applicable approval rule and set up approval chain
        approval_rules = ApprovalRule.objects.filter(
            company=expense.owner.company,
            is_active=True
        ).order_by('-priority')
        
        for rule in approval_rules:
            # Check if rule applies to this expense
            if rule.min_amount and expense.amount < rule.min_amount:
                continue
            if rule.max_amount and expense.amount > rule.max_amount:
                continue
            if rule.categories and expense.category not in rule.categories:
                continue
            
            # Apply this rule
            expense.approval_rule = rule
            expense.approval_chain = rule.approvers
            if rule.approvers:
                expense.current_approver = User.objects.get(id=rule.approvers[0])
            expense.status = 'pending'
            expense.submitted_at = timezone.now()
            expense.save()
            
            return Response({'message': 'Expense submitted for approval'})
        
        return Response(
            {'error': 'No applicable approval rule found'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get expenses pending approval by current user"""
        user = request.user
        if not user.can_approve_expenses():
            return Response(
                {'error': 'You do not have approval permissions'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        expenses = Expense.objects.filter(
            current_approver=user,
            status='pending'
        )
        
        serializer = self.get_serializer(expenses, many=True)
        return Response(serializer.data)


class ApprovalViewSet(viewsets.ModelViewSet):
    queryset = Approval.objects.all()
    serializer_class = ApprovalSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Approval.objects.filter(expense__owner__company=user.company)
        elif user.role == 'manager':
            return Approval.objects.filter(
                Q(expense__owner__company=user.company) & 
                (Q(approver=user) | Q(expense__owner__manager=user))
            )
        else:
            return Approval.objects.filter(expense__owner=user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an expense"""
        approval = self.get_object()
        
        if approval.approver != request.user:
            return Response(
                {'error': 'You can only approve expenses assigned to you'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if approval.status != 'pending':
            return Response(
                {'error': 'This approval has already been processed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approval.status = 'approved'
        approval.comment = request.data.get('comment', '')
        approval.save()
        
        return Response({'message': 'Expense approved successfully'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an expense"""
        approval = self.get_object()
        
        if approval.approver != request.user:
            return Response(
                {'error': 'You can only reject expenses assigned to you'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if approval.status != 'pending':
            return Response(
                {'error': 'This approval has already been processed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        approval.status = 'rejected'
        approval.comment = request.data.get('comment', '')
        approval.save()
        
        return Response({'message': 'Expense rejected'})
