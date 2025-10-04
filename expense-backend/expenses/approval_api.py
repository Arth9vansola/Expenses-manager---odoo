from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError
import logging

from .models import Expense, User, Approval
from .serializers import ExpenseSerializer, ApprovalSerializer
from .approval_engine import workflow_engine

logger = logging.getLogger(__name__)


class ApprovalReviewSerializer(serializers.Serializer):
    """Serializer for approval review requests."""
    
    approver_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comment = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_action(self, value):
        """Validate approval action."""
        if value not in ['approve', 'reject']:
            raise serializers.ValidationError("Action must be 'approve' or 'reject'")
        return value
    
    def validate_approver_id(self, value):
        """Validate approver exists and is active."""
        try:
            user = User.objects.get(id=value, is_active=True)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Approver not found or inactive")


class PendingApprovalsView(APIView):
    """
    API endpoint to get all pending expenses for a specific approver.
    GET /api/approvals/{approver_id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, approver_id):
        """Get all expenses pending approval for the specified approver."""
        
        try:
            # Get the approver user
            approver = get_object_or_404(User, id=approver_id, is_active=True)
            
            # Check permissions
            if not self._can_view_approvals(request.user, approver):
                return Response({
                    'error': 'Permission denied. You can only view your own pending approvals or those of users in your company.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get pending approvals using the workflow engine
            pending_approvals = workflow_engine.get_pending_approvals_for_user(approver)
            
            return Response({
                'approver': {
                    'id': str(approver.id),
                    'name': approver.name,
                    'email': approver.email,
                    'role': approver.role
                },
                'pending_expenses': pending_approvals,
                'total_count': len(pending_approvals),
                'summary': self._get_approval_summary(pending_approvals)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting pending approvals: {str(e)}")
            return Response({
                'error': 'Failed to retrieve pending approvals',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _can_view_approvals(self, current_user: User, approver: User) -> bool:
        """Check if current user can view approvals for the specified approver."""
        
        # Users can view their own pending approvals
        if current_user.id == approver.id:
            return True
        
        # Same company requirement
        if current_user.company != approver.company:
            return False
        
        # Admins can view any approver's pending list in their company
        if current_user.role == 'admin':
            return True
        
        # Managers can view their subordinates' approval lists
        if current_user.role == 'manager':
            return approver.manager == current_user or approver.role in ['employee']
        
        return False
    
    def _get_approval_summary(self, pending_approvals: list) -> dict:
        """Generate summary statistics for pending approvals."""
        
        if not pending_approvals:
            return {
                'total_amount': '0.00',
                'categories': {},
                'oldest_expense': None,
                'high_value_count': 0
            }
        
        total_amount = sum(float(exp['amount']) for exp in pending_approvals)
        categories = {}
        oldest_date = None
        high_value_count = 0
        
        for expense in pending_approvals:
            # Category count
            category = expense['category']
            categories[category] = categories.get(category, 0) + 1
            
            # Oldest expense
            exp_date = expense['date']
            if oldest_date is None or exp_date < oldest_date:
                oldest_date = exp_date
            
            # High value expenses (over $1000)
            if float(expense['amount']) > 1000:
                high_value_count += 1
        
        return {
            'total_amount': f"{total_amount:.2f}",
            'categories': categories,
            'oldest_expense': oldest_date,
            'high_value_count': high_value_count
        }


class ExpenseReviewView(APIView):
    """
    API endpoint to review (approve/reject) a specific expense.
    POST /api/approvals/{expense_id}/review/
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, expense_id):
        """Process approval review for a specific expense."""
        
        try:
            # Get the expense
            expense = get_object_or_404(Expense, id=expense_id)
            
            # Validate request data
            serializer = ApprovalReviewSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            
            # Get approver
            approver_id = validated_data['approver_id']
            approver = get_object_or_404(User, id=approver_id, is_active=True)
            
            # Check permissions
            if not self._can_review_expense(request.user, approver, expense):
                return Response({
                    'error': 'Permission denied. You can only review expenses you are authorized to approve.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Process the review using the workflow engine
            action = validated_data['action']
            comment = validated_data.get('comment', '')
            
            with transaction.atomic():
                review_result = workflow_engine.process_approval_review(
                    expense=expense,
                    approver=approver,
                    action=action,
                    comment=comment
                )
            
            # Get updated expense data
            expense.refresh_from_db()
            expense_serializer = ExpenseSerializer(expense)
            
            response_data = {
                'message': f'Expense {action}d successfully',
                'expense': expense_serializer.data,
                'review_result': review_result,
                'approval_history': workflow_engine._get_approval_history(expense)
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response({
                'error': 'Validation error',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error processing expense review: {str(e)}")
            return Response({
                'error': 'Failed to process expense review',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _can_review_expense(self, current_user: User, approver: User, expense: Expense) -> bool:
        """Check if current user can review this expense on behalf of the approver."""
        
        # Same company requirement
        if current_user.company != expense.company or current_user.company != approver.company:
            return False
        
        # Users can review as themselves
        if current_user.id == approver.id:
            return True
        
        # Admins can review on behalf of others in their company
        if current_user.role == 'admin':
            return True
        
        # Additional business logic can be added here
        # For example: managers reviewing on behalf of absent colleagues
        
        return False


class ApprovalHistoryView(APIView):
    """
    API endpoint to get approval history for a specific expense.
    GET /api/expenses/{expense_id}/approval-history/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, expense_id):
        """Get complete approval history for an expense."""
        
        try:
            # Get the expense
            expense = get_object_or_404(Expense, id=expense_id)
            
            # Check permissions
            if not self._can_view_expense_history(request.user, expense):
                return Response({
                    'error': 'Permission denied. You cannot view this expense history.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get approval history
            approval_history = workflow_engine._get_approval_history(expense)
            
            # Get approval context
            approval_context = workflow_engine._get_approval_context(expense, request.user)
            
            return Response({
                'expense': {
                    'id': str(expense.id),
                    'owner': expense.owner.name,
                    'amount': str(expense.amount),
                    'currency': expense.currency,
                    'category': expense.category,
                    'description': expense.description,
                    'status': expense.status,
                    'created_at': expense.created_at.isoformat()
                },
                'approval_history': approval_history,
                'approval_context': approval_context,
                'workflow_status': self._get_workflow_status(expense, approval_history)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting approval history: {str(e)}")
            return Response({
                'error': 'Failed to retrieve approval history',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _can_view_expense_history(self, user: User, expense: Expense) -> bool:
        """Check if user can view expense approval history."""
        
        # Same company requirement
        if user.company != expense.company:
            return False
        
        # Expense owner can view
        if expense.owner == user:
            return True
        
        # Admins can view all
        if user.role == 'admin':
            return True
        
        # Managers can view if they are in the approval chain or it's a subordinate's expense
        if user.role == 'manager':
            # Check if manager is an approver
            is_approver = Approval.objects.filter(expense=expense, approver=user).exists()
            if is_approver:
                return True
            
            # Check if it's a subordinate's expense
            if expense.owner.manager == user:
                return True
        
        return False
    
    def _get_workflow_status(self, expense: Expense, approval_history: list) -> dict:
        """Get current workflow status and next steps."""
        
        if expense.status == 'approved':
            return {
                'status': 'completed',
                'result': 'approved',
                'message': 'Expense has been fully approved'
            }
        elif expense.status == 'rejected':
            return {
                'status': 'completed', 
                'result': 'rejected',
                'message': 'Expense has been rejected'
            }
        elif expense.status in ['pending', 'submitted']:
            approval_rule = workflow_engine._get_approval_rule(expense)
            
            if not approval_rule:
                return {
                    'status': 'pending',
                    'message': 'Awaiting manager approval (no specific rule)'
                }
            
            strategy = approval_rule.approval_flow.get('strategy', 'sequential')
            
            if strategy == 'sequential':
                approvers = approval_rule.approval_flow.get('approvers', [])
                current_level = len(approval_history)
                
                if current_level < len(approvers):
                    next_approver_config = approvers[current_level]
                    next_approver = workflow_engine._find_approver_by_config(expense.company, next_approver_config)
                    
                    return {
                        'status': 'pending_sequential',
                        'message': f'Awaiting approval from {next_approver.name if next_approver else "next approver"}',
                        'step': current_level + 1,
                        'total_steps': len(approvers),
                        'next_approver': {
                            'name': next_approver.name if next_approver else 'TBD',
                            'role': next_approver.role if next_approver else 'Unknown'
                        }
                    }
            
            elif strategy == 'percentage':
                required_percentage = approval_rule.approval_flow.get('percentage_required', 60)
                eligible_count = len(approval_rule.approval_flow.get('eligible_approvers', []))
                current_count = len(approval_history)
                current_percentage = (current_count / eligible_count * 100) if eligible_count > 0 else 0
                
                return {
                    'status': 'pending_percentage',
                    'message': f'Awaiting {required_percentage}% approval. Currently at {current_percentage:.1f}%',
                    'current_percentage': current_percentage,
                    'required_percentage': required_percentage
                }
        
        return {
            'status': 'unknown',
            'message': 'Workflow status unclear'
        }


class ApprovalRulesView(APIView):
    """
    API endpoint to manage approval rules.
    GET /api/approval-rules/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all approval rules for the user's company."""
        
        if request.user.role != 'admin':
            return Response({
                'error': 'Permission denied. Only admins can view approval rules.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .models import ApprovalRule
        
        rules = ApprovalRule.objects.filter(
            company=request.user.company
        ).order_by('min_amount', 'name')
        
        rules_data = []
        for rule in rules:
            rules_data.append({
                'id': str(rule.id),
                'name': rule.name,
                'min_amount': str(rule.min_amount) if rule.min_amount else None,
                'max_amount': str(rule.max_amount) if rule.max_amount else None,
                'approval_flow': rule.approval_flow,
                'conditions': rule.conditions,
                'is_active': rule.is_active,
                'created_at': rule.created_at.isoformat()
            })
        
        return Response({
            'approval_rules': rules_data,
            'total_count': len(rules_data)
        }, status=status.HTTP_200_OK)