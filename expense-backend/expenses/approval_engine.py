from django.db import models, transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
import json
import logging
from datetime import datetime

from .models import Expense, User, Approval, ApprovalRule, Company

logger = logging.getLogger(__name__)


class ApprovalWorkflowEngine:
    """
    Core engine for managing expense approval workflows.
    Handles sequential approvals, percentage thresholds, special approver logic, and rule-based processing.
    """
    
    def __init__(self):
        self.approval_strategies = {
            'sequential': self._process_sequential_approval,
            'percentage': self._process_percentage_approval,
            'special_approver': self._process_special_approver,
            'any_manager': self._process_any_manager_approval,
            'all_managers': self._process_all_managers_approval
        }
    
    def get_pending_approvals_for_user(self, approver: User) -> List[Dict]:
        """
        Get all expenses pending approval for a specific user.
        Returns expenses where the user is the next required approver.
        """
        try:
            # Get expenses that require approval and are in pending/submitted status
            pending_expenses = Expense.objects.filter(
                company=approver.company,
                status__in=['pending', 'submitted']
            ).exclude(
                # Exclude expenses already approved by this user
                approvals__approver=approver,
                approvals__status='approved'
            )
            
            result = []
            
            for expense in pending_expenses:
                # Check if this user is a valid approver for this expense
                if self._is_valid_approver(expense, approver):
                    approval_context = self._get_approval_context(expense, approver)
                    
                    expense_data = {
                        'expense_id': str(expense.id),
                        'owner': {
                            'id': str(expense.owner.id),
                            'name': expense.owner.name,
                            'email': expense.owner.email
                        },
                        'amount': str(expense.amount),
                        'currency': expense.currency,
                        'category': expense.category,
                        'description': expense.description,
                        'date': expense.date.isoformat(),
                        'status': expense.status,
                        'receipt_url': expense.receipt.url if expense.receipt else None,
                        'created_at': expense.created_at.isoformat(),
                        'approval_context': approval_context,
                        'approval_history': self._get_approval_history(expense)
                    }
                    
                    result.append(expense_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting pending approvals for user {approver.id}: {str(e)}")
            raise
    
    def process_approval_review(self, expense: Expense, approver: User, 
                              action: str, comment: str = None) -> Dict:
        """
        Process an approval review (approve/reject) and update expense status.
        
        Args:
            expense: The expense being reviewed
            approver: The user making the approval decision
            action: 'approve' or 'reject'
            comment: Optional comment for the decision
            
        Returns:
            Dict containing the approval result and next steps
        """
        try:
            with transaction.atomic():
                # Validate the approval
                if not self._is_valid_approver(expense, approver):
                    raise ValidationError(f"User {approver.email} is not authorized to approve this expense")
                
                if expense.status not in ['pending', 'submitted']:
                    raise ValidationError(f"Expense cannot be reviewed in current status: {expense.status}")
                
                # Create approval record
                approval = Approval.objects.create(
                    expense=expense,
                    approver=approver,
                    status='approved' if action == 'approve' else 'rejected',
                    comment=comment or '',
                    metadata={
                        'approval_level': self._get_approver_level(expense, approver),
                        'approval_method': self._get_approval_method(expense),
                        'timestamp': datetime.now().isoformat()
                    }
                )
                
                if action == 'reject':
                    return self._handle_rejection(expense, approval)
                else:
                    return self._handle_approval(expense, approval)
                    
        except Exception as e:
            logger.error(f"Error processing approval review: {str(e)}")
            raise
    
    def _handle_rejection(self, expense: Expense, approval: Approval) -> Dict:
        """Handle expense rejection."""
        expense.status = 'rejected'
        expense.save()
        
        # Update expense metadata
        if not expense.metadata:
            expense.metadata = {}
        
        expense.metadata.update({
            'rejection_reason': approval.comment,
            'rejected_by': str(approval.approver.id),
            'rejected_at': datetime.now().isoformat(),
            'final_status': 'rejected'
        })
        expense.save()
        
        return {
            'action': 'rejected',
            'expense_status': 'rejected',
            'message': 'Expense has been rejected',
            'rejected_by': approval.approver.name,
            'rejection_reason': approval.comment,
            'next_action': 'notify_owner'
        }
    
    def _handle_approval(self, expense: Expense, approval: Approval) -> Dict:
        """Handle expense approval and determine next steps."""
        
        # Get the approval rule for this expense
        approval_rule = self._get_approval_rule(expense)
        
        if not approval_rule:
            # No specific rule - auto approve
            return self._finalize_approval(expense, approval, 'no_rule_auto_approve')
        
        # Process based on approval strategy
        strategy = approval_rule.approval_flow.get('strategy', 'sequential')
        processor = self.approval_strategies.get(strategy, self._process_sequential_approval)
        
        return processor(expense, approval, approval_rule)
    
    def _process_sequential_approval(self, expense: Expense, approval: Approval, 
                                   approval_rule: ApprovalRule) -> Dict:
        """Process sequential approval workflow."""
        
        approval_chain = approval_rule.approval_flow.get('approvers', [])
        current_approvals = Approval.objects.filter(
            expense=expense, 
            status='approved'
        ).count()
        
        # Check if this is the final approver in the chain
        if current_approvals >= len(approval_chain):
            return self._finalize_approval(expense, approval, 'sequential_complete')
        
        # Move to next approver
        next_approver_config = approval_chain[current_approvals] if current_approvals < len(approval_chain) else None
        
        if next_approver_config:
            next_approver = self._find_approver_by_config(expense.company, next_approver_config)
            
            return {
                'action': 'approved_pending_next',
                'expense_status': 'pending',
                'message': f'Approved by {approval.approver.name}. Awaiting approval from {next_approver.name if next_approver else "next approver"}',
                'next_approver': {
                    'id': str(next_approver.id) if next_approver else None,
                    'name': next_approver.name if next_approver else 'TBD',
                    'role': next_approver.role if next_approver else 'Unknown'
                } if next_approver else None,
                'approvals_count': current_approvals,
                'total_required': len(approval_chain)
            }
        else:
            return self._finalize_approval(expense, approval, 'sequential_complete')
    
    def _process_percentage_approval(self, expense: Expense, approval: Approval, 
                                   approval_rule: ApprovalRule) -> Dict:
        """Process percentage-based approval workflow."""
        
        required_percentage = approval_rule.approval_flow.get('percentage_required', 60)
        eligible_approvers = approval_rule.approval_flow.get('eligible_approvers', [])
        
        # Count total eligible approvers
        total_eligible = len(eligible_approvers)
        
        # Count current approvals from eligible approvers
        approved_count = Approval.objects.filter(
            expense=expense,
            status='approved',
            approver__role__in=[config.get('role') for config in eligible_approvers]
        ).count()
        
        # Calculate percentage
        current_percentage = (approved_count / total_eligible * 100) if total_eligible > 0 else 0
        
        if current_percentage >= required_percentage:
            return self._finalize_approval(expense, approval, f'percentage_met_{current_percentage:.1f}%')
        else:
            return {
                'action': 'approved_pending_percentage',
                'expense_status': 'pending',
                'message': f'Approved by {approval.approver.name}. {current_percentage:.1f}% approval rate achieved. Need {required_percentage}%',
                'current_percentage': current_percentage,
                'required_percentage': required_percentage,
                'approved_count': approved_count,
                'total_eligible': total_eligible
            }
    
    def _process_special_approver(self, expense: Expense, approval: Approval, 
                                approval_rule: ApprovalRule) -> Dict:
        """Process special approver logic (e.g., CFO auto-approve)."""
        
        special_approvers = approval_rule.approval_flow.get('special_approvers', [])
        
        # Check if current approver is a special approver
        for special_config in special_approvers:
            if self._matches_approver_config(approval.approver, special_config):
                auto_approve = special_config.get('auto_approve', False)
                
                if auto_approve:
                    return self._finalize_approval(expense, approval, f'special_approver_{approval.approver.role}')
        
        # Continue with regular sequential flow if not special approver
        return self._process_sequential_approval(expense, approval, approval_rule)
    
    def _process_any_manager_approval(self, expense: Expense, approval: Approval, 
                                    approval_rule: ApprovalRule) -> Dict:
        """Process 'any manager can approve' workflow."""
        
        if approval.approver.role in ['manager', 'admin']:
            return self._finalize_approval(expense, approval, 'any_manager_approve')
        else:
            raise ValidationError("Only managers or admins can approve expenses in this workflow")
    
    def _process_all_managers_approval(self, expense: Expense, approval: Approval, 
                                     approval_rule: ApprovalRule) -> Dict:
        """Process 'all managers must approve' workflow."""
        
        all_managers = User.objects.filter(
            company=expense.company,
            role='manager',
            is_active=True
        )
        
        approved_managers = Approval.objects.filter(
            expense=expense,
            status='approved',
            approver__role='manager'
        ).count()
        
        total_managers = all_managers.count()
        
        if approved_managers >= total_managers:
            return self._finalize_approval(expense, approval, 'all_managers_approved')
        else:
            return {
                'action': 'approved_pending_all_managers',
                'expense_status': 'pending',
                'message': f'Approved by {approval.approver.name}. {approved_managers}/{total_managers} managers have approved',
                'approved_managers': approved_managers,
                'total_managers': total_managers,
                'pending_managers': [
                    {'name': mgr.name, 'email': mgr.email} 
                    for mgr in all_managers.exclude(
                        id__in=Approval.objects.filter(
                            expense=expense, 
                            status='approved',
                            approver__role='manager'
                        ).values_list('approver_id', flat=True)
                    )
                ]
            }
    
    def _finalize_approval(self, expense: Expense, approval: Approval, reason: str) -> Dict:
        """Finalize expense approval."""
        expense.status = 'approved'
        expense.save()
        
        # Update expense metadata
        if not expense.metadata:
            expense.metadata = {}
        
        expense.metadata.update({
            'approved_at': datetime.now().isoformat(),
            'final_approver': str(approval.approver.id),
            'approval_reason': reason,
            'final_status': 'approved'
        })
        expense.save()
        
        return {
            'action': 'fully_approved',
            'expense_status': 'approved',
            'message': f'Expense fully approved by {approval.approver.name}',
            'approved_by': approval.approver.name,
            'approval_reason': reason,
            'next_action': 'notify_owner_approved'
        }
    
    def _is_valid_approver(self, expense: Expense, approver: User) -> bool:
        """Check if user is a valid approver for this expense."""
        
        # Same company check
        if expense.company != approver.company:
            return False
        
        # Owner cannot approve their own expense
        if expense.owner == approver:
            return False
        
        # Check if already approved by this user
        existing_approval = Approval.objects.filter(
            expense=expense,
            approver=approver,
            status='approved'
        ).exists()
        
        if existing_approval:
            return False
        
        # Get approval rule
        approval_rule = self._get_approval_rule(expense)
        
        if not approval_rule:
            # No specific rule - managers and admins can approve
            return approver.role in ['manager', 'admin']
        
        # Check rule-specific authorization
        return self._is_authorized_by_rule(expense, approver, approval_rule)
    
    def _is_authorized_by_rule(self, expense: Expense, approver: User, 
                             approval_rule: ApprovalRule) -> bool:
        """Check if approver is authorized according to specific rule."""
        
        approval_flow = approval_rule.approval_flow
        strategy = approval_flow.get('strategy', 'sequential')
        
        if strategy == 'sequential':
            # Check if approver is in the approval chain
            approvers = approval_flow.get('approvers', [])
            current_level = Approval.objects.filter(
                expense=expense, 
                status='approved'
            ).count()
            
            if current_level < len(approvers):
                next_approver_config = approvers[current_level]
                return self._matches_approver_config(approver, next_approver_config)
        
        elif strategy in ['percentage', 'all_managers']:
            eligible_approvers = approval_flow.get('eligible_approvers', [])
            return any(self._matches_approver_config(approver, config) for config in eligible_approvers)
        
        elif strategy == 'any_manager':
            return approver.role in ['manager', 'admin']
        
        elif strategy == 'special_approver':
            special_approvers = approval_flow.get('special_approvers', [])
            if any(self._matches_approver_config(approver, config) for config in special_approvers):
                return True
            # Fall back to sequential check
            return self._is_authorized_by_rule(
                expense, approver, 
                ApprovalRule(approval_flow={'strategy': 'sequential', 'approvers': approval_flow.get('approvers', [])})
            )
        
        return False
    
    def _matches_approver_config(self, user: User, config: Dict) -> bool:
        """Check if user matches approver configuration."""
        
        # Check role
        if 'role' in config and user.role != config['role']:
            return False
        
        # Check specific user ID
        if 'user_id' in config and str(user.id) != str(config['user_id']):
            return False
        
        # Check email
        if 'email' in config and user.email != config['email']:
            return False
        
        # Check minimum level (for hierarchical approval)
        if 'min_level' in config:
            user_level = {'employee': 1, 'manager': 2, 'admin': 3}.get(user.role, 0)
            if user_level < config['min_level']:
                return False
        
        return True
    
    def _find_approver_by_config(self, company: Company, config: Dict) -> Optional[User]:
        """Find approver user by configuration."""
        
        queryset = User.objects.filter(company=company, is_active=True)
        
        if 'user_id' in config:
            return queryset.filter(id=config['user_id']).first()
        
        if 'email' in config:
            return queryset.filter(email=config['email']).first()
        
        if 'role' in config:
            return queryset.filter(role=config['role']).first()
        
        return None
    
    def _get_approval_rule(self, expense: Expense) -> Optional[ApprovalRule]:
        """Get the applicable approval rule for an expense."""
        
        # Check if rule is stored in expense metadata
        if expense.metadata and 'approval_rule_id' in expense.metadata:
            try:
                return ApprovalRule.objects.get(id=expense.metadata['approval_rule_id'])
            except ApprovalRule.DoesNotExist:
                pass
        
        # Find applicable rule based on amount and category
        rules = ApprovalRule.objects.filter(
            company=expense.company,
            is_active=True
        ).order_by('min_amount')
        
        for rule in rules:
            # Check amount range
            if rule.min_amount and expense.amount < rule.min_amount:
                continue
            if rule.max_amount and expense.amount > rule.max_amount:
                continue
            
            # Check category
            if rule.conditions:
                categories = rule.conditions.get('categories', [])
                if categories and expense.category not in categories:
                    continue
            
            return rule
        
        return None
    
    def _get_approval_context(self, expense: Expense, approver: User) -> Dict:
        """Get approval context information for an expense."""
        
        approval_rule = self._get_approval_rule(expense)
        existing_approvals = Approval.objects.filter(expense=expense).order_by('created_at')
        
        context = {
            'requires_approval': bool(approval_rule),
            'approval_rule': {
                'id': str(approval_rule.id) if approval_rule else None,
                'name': approval_rule.name if approval_rule else None,
                'strategy': approval_rule.approval_flow.get('strategy') if approval_rule else None
            } if approval_rule else None,
            'approver_level': self._get_approver_level(expense, approver),
            'existing_approvals_count': existing_approvals.count(),
            'is_final_approver': self._is_final_approver(expense, approver, approval_rule)
        }
        
        return context
    
    def _get_approver_level(self, expense: Expense, approver: User) -> int:
        """Get the approval level for this approver."""
        existing_approvals = Approval.objects.filter(expense=expense, status='approved').count()
        return existing_approvals + 1
    
    def _is_final_approver(self, expense: Expense, approver: User, 
                          approval_rule: ApprovalRule = None) -> bool:
        """Check if this approver would be the final approver."""
        
        if not approval_rule:
            return True
        
        strategy = approval_rule.approval_flow.get('strategy', 'sequential')
        
        if strategy == 'sequential':
            approvers = approval_rule.approval_flow.get('approvers', [])
            current_level = Approval.objects.filter(expense=expense, status='approved').count()
            return current_level >= len(approvers) - 1
        
        elif strategy == 'any_manager':
            return approver.role in ['manager', 'admin']
        
        elif strategy == 'special_approver':
            special_approvers = approval_rule.approval_flow.get('special_approvers', [])
            for config in special_approvers:
                if self._matches_approver_config(approver, config) and config.get('auto_approve'):
                    return True
        
        return False
    
    def _get_approval_method(self, expense: Expense) -> str:
        """Get the approval method being used."""
        approval_rule = self._get_approval_rule(expense)
        
        if not approval_rule:
            return 'default'
        
        return approval_rule.approval_flow.get('strategy', 'sequential')
    
    def _get_approval_history(self, expense: Expense) -> List[Dict]:
        """Get complete approval history for an expense."""
        
        approvals = Approval.objects.filter(expense=expense).order_by('created_at')
        
        history = []
        for approval in approvals:
            history.append({
                'id': str(approval.id),
                'approver': {
                    'id': str(approval.approver.id),
                    'name': approval.approver.name,
                    'email': approval.approver.email,
                    'role': approval.approver.role
                },
                'status': approval.status,
                'comment': approval.comment,
                'created_at': approval.created_at.isoformat(),
                'metadata': approval.metadata or {}
            })
        
        return history


# Global instance
workflow_engine = ApprovalWorkflowEngine()