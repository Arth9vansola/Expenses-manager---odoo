"""
Enhanced Expense Management API with Permissions and Validation
Provides secure expense CRUD operations with comprehensive permission checks and validation
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.utils import timezone
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional

from .models import Expense, User, Company, ApprovalRule, Approval
from .permissions import (
    IsOwnerOrAdmin, CanViewExpense, IsAssignedApprover,
    validate_expense_data, validate_required_fields,
    check_expense_permissions, require_permissions,
    validate_request_data, create_validation_error_response,
    create_permission_error_response
)

logger = logging.getLogger(__name__)

# ============================================================================
# Expense Management API Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def expenses_list_create(request):
    """
    List expenses (GET) or create new expense (POST)
    
    Permissions:
    - GET: Admin sees all, Manager sees company/team, Employee sees own
    - POST: All authenticated users can create expenses for themselves
    """
    if request.method == 'GET':
        return list_expenses(request)
    elif request.method == 'POST':
        return create_expense(request)


def list_expenses(request):
    """
    List expenses based on user permissions and filters
    """
    try:
        user = request.user
        
        # Determine base queryset based on user role
        if user.role == 'admin' or user.is_staff:
            # Admin can see all expenses
            expenses_qs = Expense.objects.all()
            can_see_all = True
        elif user.role == 'manager':
            # Manager can see company expenses and team expenses
            company_expenses = Q(owner__company=user.company) if user.company else Q()
            team_expenses = Q(owner__manager=user)
            own_expenses = Q(owner=user)
            expenses_qs = Expense.objects.filter(company_expenses | team_expenses | own_expenses)
            can_see_all = False
        else:
            # Employee can only see own expenses
            expenses_qs = Expense.objects.filter(owner=user)
            can_see_all = False
        
        # Apply filters
        status_filter = request.GET.get('status')
        if status_filter:
            expenses_qs = expenses_qs.filter(status=status_filter)
        
        category_filter = request.GET.get('category')
        if category_filter:
            expenses_qs = expenses_qs.filter(category=category_filter)
        
        # Date range filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                expenses_qs = expenses_qs.filter(date__gte=start_date_obj)
            except ValueError:
                return create_validation_error_response({
                    'start_date': 'Invalid date format. Use YYYY-MM-DD'
                })
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                expenses_qs = expenses_qs.filter(date__lte=end_date_obj)
            except ValueError:
                return create_validation_error_response({
                    'end_date': 'Invalid date format. Use YYYY-MM-DD'
                })
        
        # Amount range filters
        min_amount = request.GET.get('min_amount')
        max_amount = request.GET.get('max_amount')
        if min_amount:
            try:
                min_amount_val = Decimal(min_amount)
                expenses_qs = expenses_qs.filter(amount__gte=min_amount_val)
            except:
                return create_validation_error_response({
                    'min_amount': 'Invalid amount format'
                })
        
        if max_amount:
            try:
                max_amount_val = Decimal(max_amount)
                expenses_qs = expenses_qs.filter(amount__lte=max_amount_val)
            except:
                return create_validation_error_response({
                    'max_amount': 'Invalid amount format'
                })
        
        # User filter (admin/manager only)
        user_id_filter = request.GET.get('user_id')
        if user_id_filter and can_see_all:
            expenses_qs = expenses_qs.filter(owner_id=user_id_filter)
        
        # Order by most recent first
        expenses_qs = expenses_qs.select_related('owner', 'current_approver').order_by('-created_at')
        
        # Pagination
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        total_count = expenses_qs.count()
        expenses = expenses_qs[start_idx:end_idx]
        
        # Serialize expenses
        expenses_data = []
        for expense in expenses:
            # Check if user can view this specific expense
            permission_check = check_expense_permissions(user, expense, 'view')
            if not permission_check["allowed"]:
                continue
            
            expense_data = {
                'id': expense.id,
                'amount': str(expense.amount),
                'currency': expense.currency,
                'description': expense.description,
                'category': expense.category,
                'expense_date': expense.date.isoformat() if expense.date else None,
                'status': expense.status,
                'receipt_url': expense.receipt_url,
                'created_at': expense.created_at.isoformat(),
                'updated_at': expense.updated_at.isoformat(),
                'owner': {
                    'id': expense.owner.id,
                    'name': expense.owner.name,
                    'email': expense.owner.email
                } if can_see_all or expense.owner == user else None,
                'company': {
                    'id': expense.company.id if expense.company else None,
                    'name': expense.company.name if expense.company else None
                } if expense.company else None,
                'current_approver': {
                    'id': expense.current_approver.id if expense.current_approver else None,
                    'name': expense.current_approver.name if expense.current_approver else None,
                    'email': expense.current_approver.email if expense.current_approver else None
                } if expense.current_approver else None,
                'permissions': {
                    'can_edit': check_expense_permissions(user, expense, 'edit')["allowed"],
                    'can_delete': check_expense_permissions(user, expense, 'delete')["allowed"],
                    'can_approve': check_expense_permissions(user, expense, 'approve')["allowed"],
                    'can_reject': check_expense_permissions(user, expense, 'reject')["allowed"]
                }
            }
            expenses_data.append(expense_data)
        
        return Response({
            "success": True,
            "message": f"Retrieved {len(expenses_data)} expenses",
            "data": {
                "expenses": expenses_data,
                "pagination": {
                    "current_page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": (total_count + page_size - 1) // page_size,
                    "has_next": end_idx < total_count,
                    "has_previous": page > 1
                },
                "filters_applied": {
                    "status": status_filter,
                    "category": category_filter,
                    "start_date": start_date,
                    "end_date": end_date,
                    "min_amount": min_amount,
                    "max_amount": max_amount,
                    "user_id": user_id_filter if can_see_all else None
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error listing expenses: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve expenses",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@validate_request_data(validate_expense_data, is_update=False)
def create_expense(request):
    """
    Create a new expense
    """
    try:
        data = request.data
        user = request.user
        
        # Users can only create expenses for themselves (unless admin)
        expense_user = user
        if 'user_id' in data and user.role == 'admin':
            try:
                expense_user = User.objects.get(id=data['user_id'])
            except User.DoesNotExist:
                return create_validation_error_response({
                    'user_id': 'Invalid user ID'
                })
        elif 'user_id' in data and user.role != 'admin':
            return create_permission_error_response(
                "Permission denied",
                "You can only create expenses for yourself"
            )
        
        with transaction.atomic():
            # Create expense
            expense_data = {
                'owner': expense_user,
                'amount': Decimal(str(data['amount'])),
                'currency': data.get('currency', 'USD'),
                'description': data['description'].strip(),
                'category': data['category'],
                'date': data.get('expense_date', date.today()),
                'receipt_url': data.get('receipt_image', ''),
                'status': 'draft'
            }
            
            # Handle expense date
            if isinstance(expense_data['date'], str):
                expense_data['date'] = datetime.strptime(expense_data['date'], '%Y-%m-%d').date()
            
            # Create the expense
            expense = Expense.objects.create(**expense_data)
            
            # Auto-submit if requested and valid
            if data.get('auto_submit', False):
                # Find applicable approval rule
                approval_rule = find_applicable_approval_rule(expense)
                if approval_rule:
                    # Create approval steps and submit
                    create_approval_steps(expense, approval_rule)
                    expense.status = 'pending_approval'
                    expense.save()
                    
                    logger.info(f"Expense auto-submitted: {expense.id} by {user.email}")
            
            # Return created expense data
            expense_data = serialize_expense(expense, user)
            
            logger.info(f"Expense created: {expense.id} by {user.email}")
            
            return Response({
                "success": True,
                "message": "Expense created successfully",
                "data": {
                    "expense": expense_data
                }
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        logger.error(f"Error creating expense: {e}")
        return Response({
            "success": False,
            "error": "Failed to create expense",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def expense_detail(request, pk):
    """
    Get, update, or delete a specific expense
    """
    try:
        expense = get_object_or_404(Expense, id=pk)
        
        # Check permissions based on method
        if request.method == 'GET':
            return get_expense_detail(request, expense)
        elif request.method == 'PUT':
            return update_expense(request, expense)
        elif request.method == 'DELETE':
            return delete_expense(request, expense)
            
    except Expense.DoesNotExist:
        return Response({
            "success": False,
            "error": "Expense not found",
            "details": f"No expense found with ID {pk}"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in expense detail endpoint: {e}")
        return Response({
            "success": False,
            "error": "Internal server error",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_expense_detail(request, expense):
    """
    Get detailed information about a specific expense
    """
    # Check view permissions
    permission_check = check_expense_permissions(request.user, expense, 'view')
    if not permission_check["allowed"]:
        return create_permission_error_response(
            "Permission denied",
            permission_check.get("reason", "You don't have permission to view this expense")
        )
    
    # Serialize expense with full details
    expense_data = serialize_expense(expense, request.user, include_full_details=True)
    
    return Response({
        "success": True,
        "message": "Expense details retrieved successfully",
        "data": {
            "expense": expense_data
        }
    }, status=status.HTTP_200_OK)


@validate_request_data(validate_expense_data, is_update=True)
def update_expense(request, expense):
    """
    Update an expense (only if in draft status or admin)
    """
    # Check edit permissions
    permission_check = check_expense_permissions(request.user, expense, 'edit')
    if not permission_check["allowed"]:
        return create_permission_error_response(
            "Permission denied",
            permission_check.get("reason", "You don't have permission to edit this expense")
        )
    
    try:
        data = request.data
        user = request.user
        
        # Only allow editing if expense is in draft status (unless admin)
        if expense.status != 'draft' and user.role != 'admin':
            return create_validation_error_response({
                'status': 'Can only edit expenses in draft status'
            })
        
        with transaction.atomic():
            # Update allowed fields
            if 'amount' in data:
                expense.amount = Decimal(str(data['amount']))
            
            if 'currency' in data:
                expense.currency = data['currency']
            
            if 'description' in data:
                expense.description = data['description'].strip()
            
            if 'category' in data:
                expense.category = data['category']
            
            if 'expense_date' in data:
                expense_date = data['expense_date']
                if isinstance(expense_date, str):
                    expense_date = datetime.strptime(expense_date, '%Y-%m-%d').date()
                expense.date = expense_date
            
            if 'receipt_image' in data:
                expense.receipt_url = data['receipt_image']
            
            expense.save()
            
            # Return updated expense data
            expense_data = serialize_expense(expense, user)
            
            logger.info(f"Expense updated: {expense.id} by {user.email}")
            
            return Response({
                "success": True,
                "message": "Expense updated successfully",
                "data": {
                    "expense": expense_data
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error updating expense: {e}")
        return Response({
            "success": False,
            "error": "Failed to update expense",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def delete_expense(request, expense):
    """
    Delete an expense (only owner in draft status or admin)
    """
    # Check delete permissions
    permission_check = check_expense_permissions(request.user, expense, 'delete')
    if not permission_check["allowed"]:
        return create_permission_error_response(
            "Permission denied",
            permission_check.get("reason", "You don't have permission to delete this expense")
        )
    
    try:
        user = request.user
        
        # Only allow deletion if expense is in draft status (unless admin)
        if expense.status != 'draft' and user.role != 'admin':
            return create_validation_error_response({
                'status': 'Can only delete expenses in draft status'
            })
        
        expense_id = expense.id
        expense_description = expense.description
        expense.delete()
        
        logger.info(f"Expense deleted: {expense_id} by {user.email}")
        
        return Response({
            "success": True,
            "message": f"Expense '{expense_description}' deleted successfully",
            "data": {
                "deleted_expense_id": expense_id
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error deleting expense: {e}")
        return Response({
            "success": False,
            "error": "Failed to delete expense",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Expense Submission and Approval API
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_expense(request, pk):
    """
    Submit an expense for approval
    """
    try:
        expense = get_object_or_404(Expense, id=pk)
        user = request.user
        
        # Check if user can submit this expense
        if expense.owner != user and user.role != 'admin':
            return create_permission_error_response(
                "Permission denied",
                "You can only submit your own expenses"
            )
        
        # Check if expense is in draft status
        if expense.status != 'draft':
            return create_validation_error_response({
                'status': f'Cannot submit expense with status: {expense.status}'
            })
        
        with transaction.atomic():
            # Find applicable approval rule
            approval_rule = find_applicable_approval_rule(expense)
            
            if not approval_rule:
                return create_validation_error_response({
                    'approval_rule': 'No applicable approval rule found for this expense amount and company'
                })
            
            # Create approval steps
            create_approval_steps(expense, approval_rule)
            
            # Update expense status
            expense.status = 'pending'
            expense.save()
            
            logger.info(f"Expense submitted: {expense.id} by {user.email}")
            
            # Return updated expense data
            expense_data = serialize_expense(expense, user, include_full_details=True)
            
            return Response({
                "success": True,
                "message": "Expense submitted for approval successfully",
                "data": {
                    "expense": expense_data,
                    "approval_rule": {
                        "id": approval_rule.id,
                        "name": approval_rule.name,
                        "steps_count": approval_rule.approval_config.get('steps', 0) if approval_rule.approval_config else 0
                    }
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error submitting expense: {e}")
        return Response({
            "success": False,
            "error": "Failed to submit expense",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_expense(request, pk):
    """
    Approve an expense at current approval step
    """
    try:
        expense = get_object_or_404(Expense, id=pk)
        user = request.user
        
        # Check approve permissions
        permission_check = check_expense_permissions(user, expense, 'approve')
        if not permission_check["allowed"]:
            return create_permission_error_response(
                "Permission denied",
                permission_check.get("reason", "You are not authorized to approve this expense")
            )
        
        # Get approval comment
        data = request.data
        comment = data.get('comment', '').strip()
        
        with transaction.atomic():
            current_approver = expense.current_approver
            
            if not current_approver or current_approver != user:
                return create_validation_error_response({
                    'approval': 'You are not the assigned approver for this expense'
                })
            
            # Create or update approval record
            approval, created = Approval.objects.get_or_create(
                expense=expense,
                approver=user,
                defaults={
                    'status': 'approved',
                    'comment': comment,
                    'approval_order': 1,  # Simplified for now
                    'is_final_approval': True  # Simplified for now
                }
            )
            
            if not created:
                approval.status = 'approved'
                approval.comment = comment
                approval.save()
            
            # Update expense status
            expense.status = 'approved'
            expense.approved_at = timezone.now()
            expense.current_approver = None
            expense.save()
            
            message = "Expense approved successfully!"
            
            logger.info(f"Expense approval: {expense.id} by {user.email}")
            
            # Return updated expense data
            expense_data = serialize_expense(expense, user, include_full_details=True)
            
            return Response({
                "success": True,
                "message": message,
                "data": {
                    "expense": expense_data,
                    "approval_action": {
                        "action": "approved",
                        "approver": f"{user.first_name} {user.last_name}",
                        "approval_date": approval.timestamp.isoformat(),
                        "comment": comment
                    }
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error approving expense: {e}")
        return Response({
            "success": False,
            "error": "Failed to approve expense",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_expense(request, pk):
    """
    Reject an expense at current approval step
    """
    try:
        expense = get_object_or_404(Expense, id=pk)
        user = request.user
        
        # Check reject permissions
        permission_check = check_expense_permissions(user, expense, 'reject')
        if not permission_check["allowed"]:
            return create_permission_error_response(
                "Permission denied",
                permission_check.get("reason", "You are not authorized to reject this expense")
            )
        
        # Get rejection reason (required)
        data = request.data
        reason = data.get('reason', '').strip()
        
        if not reason:
            return create_validation_error_response({
                'reason': 'Rejection reason is required'
            })
        
        with transaction.atomic():
            current_approver = expense.current_approver
            
            if not current_approver or current_approver != user:
                return create_validation_error_response({
                    'approval': 'You are not the assigned approver for this expense'
                })
            
            # Create or update approval record
            approval, created = Approval.objects.get_or_create(
                expense=expense,
                approver=user,
                defaults={
                    'status': 'rejected',
                    'comment': reason,
                    'approval_order': 1
                }
            )
            
            if not created:
                approval.status = 'rejected'
                approval.comment = reason
                approval.save()
            
            # Update expense status
            expense.status = 'rejected'
            expense.current_approver = None
            expense.save()
            
            logger.info(f"Expense rejected: {expense.id} by {user.email}")
            
            # Return updated expense data
            expense_data = serialize_expense(expense, user, include_full_details=True)
            
            return Response({
                "success": True,
                "message": "Expense rejected",
                "data": {
                    "expense": expense_data,
                    "rejection_details": {
                        "rejected_by": f"{user.first_name} {user.last_name}",
                        "reason": reason,
                        "rejection_date": approval.timestamp.isoformat()
                    }
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error rejecting expense: {e}")
        return Response({
            "success": False,
            "error": "Failed to reject expense",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Helper Functions
# ============================================================================

def find_applicable_approval_rule(expense):
    """
    Find the applicable approval rule for an expense
    """
    try:
        company = expense.company or expense.user.company
        if not company:
            return None
        
        # Get active approval rules for the company
        rules = ApprovalRule.objects.filter(
            company=company,
            is_active=True
        ).order_by('-priority')
        
        for rule in rules:
            amount_range = rule.amount_range or {}
            min_amount = Decimal(str(amount_range.get('min_amount', 0)))
            max_amount = amount_range.get('max_amount')
            
            # Check if expense amount fits this rule
            if expense.amount >= min_amount:
                if max_amount is None or expense.amount <= Decimal(str(max_amount)):
                    return rule
        
        return None
    except Exception as e:
        logger.error(f"Error finding approval rule: {e}")
        return None


def create_approval_steps(expense, approval_rule):
    """
    Create approval workflow for an expense based on approval rule
    """
    try:
        # For simplified implementation, use the specific_approver or first approver from the rule
        approvers = approval_rule.approvers or []
        
        if approval_rule.specific_approver:
            expense.current_approver = approval_rule.specific_approver
        elif approvers:
            # Get first approver from the list
            first_approver_id = approvers[0]
            try:
                first_approver = User.objects.get(id=first_approver_id)
                expense.current_approver = first_approver
            except User.DoesNotExist:
                logger.error(f"Approver not found: {first_approver_id}")
        
        expense.save()
        return True
    except Exception as e:
        logger.error(f"Error setting up approval workflow: {e}")
        return False


def serialize_expense(expense, requesting_user, include_full_details=False):
    """
    Serialize expense object for API response
    """
    is_admin = requesting_user.role == 'admin' or requesting_user.is_staff
    is_owner = expense.owner == requesting_user
    
    data = {
        'id': expense.id,
        'amount': str(expense.amount),
        'currency': expense.currency,
        'description': expense.description,
        'category': expense.category,
        'expense_date': expense.date.isoformat() if expense.date else None,
        'status': expense.status,
        'receipt_url': expense.receipt_url,
        'created_at': expense.created_at.isoformat(),
        'updated_at': expense.updated_at.isoformat(),
    }
    
    # Add user info if admin or owner
    if is_admin or is_owner:
        data['owner'] = {
            'id': expense.owner.id,
            'name': expense.owner.name,
            'email': expense.owner.email
        }
    
    # Add company info
    if expense.company:
        data['company'] = {
            'id': expense.company.id,
            'name': expense.company.name
        }
    
        # Add approval info if requested
        if include_full_details:
            data['current_approver'] = None
            if expense.current_approver:
                data['current_approver'] = {
                    'id': expense.current_approver.id,
                    'name': f"{expense.current_approver.first_name} {expense.current_approver.last_name}",
                    'email': expense.current_approver.email,
                    'role': expense.current_approver.role
                }        # Add all approvals for admin/owner
        if is_admin or is_owner:
            approvals = Approval.objects.filter(expense=expense).order_by('approval_order', 'timestamp')
            data['approvals'] = [
                {
                    'id': approval.id,
                    'approver': {
                        'id': approval.approver.id,
                        'name': f"{approval.approver.first_name} {approval.approver.last_name}",
                        'email': approval.approver.email
                    },
                    'status': approval.status,
                    'comment': approval.comment,
                    'timestamp': approval.timestamp.isoformat(),
                    'approval_order': approval.approval_order,
                    'is_final_approval': approval.is_final_approval
                } for approval in approvals
            ]
    
    # Add permissions
    data['permissions'] = {
        'can_edit': check_expense_permissions(requesting_user, expense, 'edit')["allowed"],
        'can_delete': check_expense_permissions(requesting_user, expense, 'delete')["allowed"],
        'can_approve': check_expense_permissions(requesting_user, expense, 'approve')["allowed"],
        'can_reject': check_expense_permissions(requesting_user, expense, 'reject')["allowed"],
        'can_submit': expense.status == 'draft' and (is_owner or is_admin)
    }
    
    return data