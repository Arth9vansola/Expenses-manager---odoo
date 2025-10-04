"""
Permission and Validation System for Expense Management
Provides comprehensive permission checks and validation for all endpoints
"""

from rest_framework.permissions import BasePermission
from rest_framework import status
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from functools import wraps
import logging
from typing import Any, Dict, List, Optional, Union, TYPE_CHECKING
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
import re

if TYPE_CHECKING:
    from .models import User, Expense, ApprovalRule, Approval, Company
else:
    from .models import User, Expense, ApprovalRule, Approval, Company

logger = logging.getLogger(__name__)

UserModel = get_user_model()

# ============================================================================
# Custom Permission Classes
# ============================================================================

class IsAdminUser(BasePermission):
    """
    Permission class that only allows admin users to access the endpoint
    """
    message = "Only admin users can access this resource."
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser)
        )


class IsManagerOrAdmin(BasePermission):
    """
    Permission class that allows managers and admins to access the endpoint
    """
    message = "Only managers and admin users can access this resource."
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['manager', 'admin'] or
            request.user.is_staff or 
            request.user.is_superuser
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Permission class that allows owners of objects or admins to access
    """
    message = "You can only access your own resources unless you are an admin."
    
    def has_object_permission(self, request, view, obj):
        # Admin users can access everything
        if request.user.role == 'admin' or request.user.is_staff:
            return True
            
        # Check if user owns the object
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True
        if obj == request.user:
            return True
            
        return False


class IsAssignedApprover(BasePermission):
    """
    Permission class that only allows assigned approvers to approve/reject expenses
    """
    message = "Only assigned approvers can approve or reject this expense at the current step."
    
    def has_object_permission(self, request, view, obj):
        # Admin users can always approve
        if request.user.role == 'admin' or request.user.is_staff:
            return True
            
        # Check if user is the current approver
        if hasattr(obj, 'current_approver'):
            if obj.current_approver and obj.current_approver == request.user:
                return True
                
        return False


class CanViewExpense(BasePermission):
    """
    Permission class for viewing expenses - employees can view own, managers can view team, admins all
    """
    message = "You don't have permission to view this expense."
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can view all
        if user.role == 'admin' or user.is_staff:
            return True
            
        # Owner can view their own
        if hasattr(obj, 'user') and obj.user == user:
            return True
            
        # Manager can view their team's expenses
        if user.role == 'manager':
            if hasattr(obj, 'user') and obj.user.manager == user:
                return True
                
        # Approvers can view expenses they need to approve
        if hasattr(obj, 'current_approver'):
            if obj.current_approver and obj.current_approver == user:
                return True
                
        return False


# ============================================================================
# Validation Functions
# ============================================================================

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
    """
    Validate that all required fields are present and not empty
    
    Args:
        data: Dictionary containing request data
        required_fields: List of required field names
        
    Returns:
        Dictionary with validation results
        
    Raises:
        ValidationError: If validation fails
    """
    errors = {}
    
    for field in required_fields:
        if field not in data:
            errors[field] = f"This field is required."
        elif data[field] is None:
            errors[field] = f"This field cannot be null."
        elif isinstance(data[field], str) and not data[field].strip():
            errors[field] = f"This field cannot be empty."
    
    if errors:
        raise ValidationError(errors)
    
    return {"valid": True, "errors": {}}


def validate_user_role(user: Any, allowed_roles: List[str]) -> Dict[str, Any]:
    """
    Validate that user has one of the allowed roles
    
    Args:
        user: User object to validate
        allowed_roles: List of allowed role names
        
    Returns:
        Dictionary with validation results
    """
    if not user or not user.is_authenticated:
        return {
            "valid": False,
            "error": "Authentication required"
        }
    
    user_roles = [user.role]
    if user.is_staff:
        user_roles.append('staff')
    if user.is_superuser:
        user_roles.append('superuser')
    
    if not any(role in allowed_roles for role in user_roles):
        return {
            "valid": False,
            "error": f"User role '{user.role}' is not authorized. Allowed roles: {', '.join(allowed_roles)}"
        }
    
    return {"valid": True}


def validate_expense_data(data: Dict[str, Any], is_update: bool = False) -> Dict[str, Any]:
    """
    Validate expense creation/update data
    
    Args:
        data: Expense data dictionary
        is_update: Whether this is an update operation
        
    Returns:
        Dictionary with validation results
    """
    errors = {}
    
    # Required fields for creation
    if not is_update:
        required_fields = ['amount', 'description', 'category']
        try:
            validate_required_fields(data, required_fields)
        except ValidationError as e:
            errors.update(e.message_dict)
    
    # Validate amount
    if 'amount' in data:
        try:
            amount = Decimal(str(data['amount']))
            if amount <= 0:
                errors['amount'] = "Amount must be greater than zero."
            if amount > Decimal('999999.99'):
                errors['amount'] = "Amount cannot exceed $999,999.99."
        except (ValueError, InvalidOperation):
            errors['amount'] = "Amount must be a valid decimal number."
    
    # Validate description
    if 'description' in data:
        description = str(data['description']).strip()
        if len(description) < 3:
            errors['description'] = "Description must be at least 3 characters long."
        if len(description) > 500:
            errors['description'] = "Description cannot exceed 500 characters."
    
    # Validate category
    if 'category' in data:
        valid_categories = [
            'Travel', 'Meals', 'Office Supplies', 'Transportation', 
            'Entertainment', 'Healthcare', 'Technology', 'Other'
        ]
        if data['category'] not in valid_categories:
            errors['category'] = f"Invalid category. Must be one of: {', '.join(valid_categories)}"
    
    # Validate date
    if 'expense_date' in data and data['expense_date']:
        try:
            if isinstance(data['expense_date'], str):
                expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
            else:
                expense_date = data['expense_date']
            
            if expense_date > date.today():
                errors['expense_date'] = "Expense date cannot be in the future."
        except ValueError:
            errors['expense_date'] = "Invalid date format. Use YYYY-MM-DD."
    
    # Validate currency
    if 'currency' in data:
        valid_currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR']
        if data['currency'] not in valid_currencies:
            errors['currency'] = f"Invalid currency. Must be one of: {', '.join(valid_currencies)}"
    
    # Validate receipt URLs/paths
    if 'receipt_image' in data and data['receipt_image']:
        receipt = str(data['receipt_image'])
        if len(receipt) > 255:
            errors['receipt_image'] = "Receipt image path/URL is too long (max 255 characters)."
    
    return {"valid": len(errors) == 0, "errors": errors}


def validate_user_data(data: Dict[str, Any], is_update: bool = False) -> Dict[str, Any]:
    """
    Validate user creation/update data
    
    Args:
        data: User data dictionary  
        is_update: Whether this is an update operation
        
    Returns:
        Dictionary with validation results
    """
    errors = {}
    
    # Required fields for creation
    if not is_update:
        required_fields = ['email', 'first_name', 'last_name', 'role']
        try:
            validate_required_fields(data, required_fields)
        except ValidationError as e:
            errors.update(e.message_dict)
    
    # Validate email
    if 'email' in data:
        email = str(data['email']).strip().lower()
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            errors['email'] = "Enter a valid email address."
        
        # Check if email already exists (for creation or different user)
        existing_user = User.objects.filter(email=email).first()
        if existing_user and (not is_update or existing_user.email != data.get('original_email')):
            errors['email'] = "A user with this email already exists."
    
    # Validate names
    for field in ['first_name', 'last_name']:
        if field in data:
            name = str(data[field]).strip()
            if len(name) < 2:
                errors[field] = f"{field.replace('_', ' ').title()} must be at least 2 characters long."
            if len(name) > 50:
                errors[field] = f"{field.replace('_', ' ').title()} cannot exceed 50 characters."
            if not re.match(r'^[a-zA-Z\s\'-]+$', name):
                errors[field] = f"{field.replace('_', ' ').title()} can only contain letters, spaces, hyphens, and apostrophes."
    
    # Validate role
    if 'role' in data:
        valid_roles = ['employee', 'manager', 'admin']
        if data['role'] not in valid_roles:
            errors['role'] = f"Invalid role. Must be one of: {', '.join(valid_roles)}"
    
    # Validate company relationship
    if 'company_id' in data:
        try:
            company = Company.objects.get(id=data['company_id'])
            if not company.is_active:
                errors['company_id'] = "Cannot assign user to an inactive company."
        except Company.DoesNotExist:
            errors['company_id'] = "Invalid company ID."
    
    # Validate manager relationship
    if 'manager_id' in data and data['manager_id']:
        try:
            manager = User.objects.get(id=data['manager_id'])
            if manager.role not in ['manager', 'admin']:
                errors['manager_id'] = "Manager must have 'manager' or 'admin' role."
            if 'company_id' in data and manager.company_id != data['company_id']:
                errors['manager_id'] = "Manager must be in the same company."
        except User.DoesNotExist:
            errors['manager_id'] = "Invalid manager ID."
    
    return {"valid": len(errors) == 0, "errors": errors}


def validate_approval_rule_data(data: Dict[str, Any], is_update: bool = False) -> Dict[str, Any]:
    """
    Validate approval rule creation/update data
    
    Args:
        data: Approval rule data dictionary
        is_update: Whether this is an update operation
        
    Returns:
        Dictionary with validation results
    """
    errors = {}
    
    # Required fields for creation
    if not is_update:
        required_fields = ['name', 'company_id', 'amount_range', 'approval_config']
        try:
            validate_required_fields(data, required_fields)
        except ValidationError as e:
            errors.update(e.message_dict)
    
    # Validate name
    if 'name' in data:
        name = str(data['name']).strip()
        if len(name) < 3:
            errors['name'] = "Rule name must be at least 3 characters long."
        if len(name) > 100:
            errors['name'] = "Rule name cannot exceed 100 characters."
    
    # Validate company
    if 'company_id' in data:
        try:
            company = Company.objects.get(id=data['company_id'])
            if not company.is_active:
                errors['company_id'] = "Cannot create rule for inactive company."
        except Company.DoesNotExist:
            errors['company_id'] = "Invalid company ID."
    
    # Validate amount range
    if 'amount_range' in data:
        amount_range = data['amount_range']
        if not isinstance(amount_range, dict):
            errors['amount_range'] = "Amount range must be an object."
        else:
            # Validate min_amount
            if 'min_amount' in amount_range:
                try:
                    min_amount = Decimal(str(amount_range['min_amount']))
                    if min_amount < 0:
                        errors['amount_range.min_amount'] = "Minimum amount cannot be negative."
                except (ValueError, InvalidOperation):
                    errors['amount_range.min_amount'] = "Minimum amount must be a valid decimal."
            
            # Validate max_amount
            if 'max_amount' in amount_range:
                try:
                    max_amount = Decimal(str(amount_range['max_amount']))
                    if max_amount < 0:
                        errors['amount_range.max_amount'] = "Maximum amount cannot be negative."
                    
                    # Check that max >= min
                    if 'min_amount' in amount_range:
                        try:
                            min_amount = Decimal(str(amount_range['min_amount']))
                            if max_amount < min_amount:
                                errors['amount_range'] = "Maximum amount must be greater than or equal to minimum amount."
                        except:
                            pass
                except (ValueError, InvalidOperation):
                    errors['amount_range.max_amount'] = "Maximum amount must be a valid decimal."
    
    # Validate approval config
    if 'approval_config' in data:
        approval_config = data['approval_config']
        if not isinstance(approval_config, dict):
            errors['approval_config'] = "Approval config must be an object."
        else:
            # Validate approval type
            approval_type = approval_config.get('type', 'sequential')
            if approval_type not in ['sequential', 'parallel', 'any']:
                errors['approval_config.type'] = "Invalid approval type. Must be 'sequential', 'parallel', or 'any'."
            
            # Validate steps configuration
            if 'steps' in approval_config:
                steps = approval_config['steps']
                if not isinstance(steps, list):
                    errors['approval_config.steps'] = "Steps must be a list."
                else:
                    for i, step in enumerate(steps):
                        if not isinstance(step, dict):
                            errors[f'approval_config.steps[{i}]'] = "Each step must be an object."
                            continue
                        
                        # Validate step order
                        if 'order' not in step:
                            errors[f'approval_config.steps[{i}].order'] = "Step order is required."
                        elif not isinstance(step['order'], int) or step['order'] < 1:
                            errors[f'approval_config.steps[{i}].order'] = "Step order must be a positive integer."
                        
                        # Validate approvers
                        if 'approvers' not in step:
                            errors[f'approval_config.steps[{i}].approvers'] = "Step approvers are required."
                        elif not isinstance(step['approvers'], list):
                            errors[f'approval_config.steps[{i}].approvers'] = "Step approvers must be a list."
                        elif len(step['approvers']) == 0:
                            errors[f'approval_config.steps[{i}].approvers'] = "At least one approver is required per step."
                        else:
                            # Validate each approver ID
                            for j, approver_id in enumerate(step['approvers']):
                                try:
                                    approver = User.objects.get(id=approver_id)
                                    if approver.role not in ['manager', 'admin']:
                                        errors[f'approval_config.steps[{i}].approvers[{j}]'] = f"User {approver.email} does not have approval permissions."
                                except User.DoesNotExist:
                                    errors[f'approval_config.steps[{i}].approvers[{j}]'] = f"Invalid approver ID: {approver_id}"
                        
                        # Validate minimum required approvals
                        if 'min_required' in step:
                            min_required = step['min_required']
                            if not isinstance(min_required, int) or min_required < 1:
                                errors[f'approval_config.steps[{i}].min_required'] = "Minimum required approvals must be a positive integer."
                            elif 'approvers' in step and min_required > len(step['approvers']):
                                errors[f'approval_config.steps[{i}].min_required'] = "Minimum required cannot exceed number of approvers."
    
    return {"valid": len(errors) == 0, "errors": errors}


# ============================================================================
# Permission Decorator Functions
# ============================================================================

def require_permissions(allowed_roles: List[str] = None, check_object_owner: bool = False):
    """
    Decorator to enforce permission checks on API endpoints
    
    Args:
        allowed_roles: List of roles allowed to access the endpoint
        check_object_owner: Whether to check if user owns the object
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Check authentication
            if not request.user or not request.user.is_authenticated:
                return Response({
                    "success": False,
                    "error": "Authentication required",
                    "details": "You must be logged in to access this resource."
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Check role permissions
            if allowed_roles:
                role_validation = validate_user_role(request.user, allowed_roles)
                if not role_validation["valid"]:
                    return Response({
                        "success": False,
                        "error": "Permission denied",
                        "details": role_validation["error"]
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Check object ownership if required
            if check_object_owner and 'pk' in kwargs:
                # This is a simplified check - more complex logic would be in the view
                pass
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def validate_request_data(validation_func, is_update: bool = False):
    """
    Decorator to validate request data using provided validation function
    
    Args:
        validation_func: Function to validate the request data
        is_update: Whether this is an update operation
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            try:
                # Get request data
                data = getattr(request, 'data', {})
                if hasattr(data, 'dict'):
                    data = data.dict()
                
                # Validate data
                validation_result = validation_func(data, is_update=is_update)
                
                if not validation_result["valid"]:
                    return Response({
                        "success": False,
                        "error": "Validation failed",
                        "details": validation_result["errors"]
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                return view_func(request, *args, **kwargs)
            
            except Exception as e:
                logger.error(f"Validation error in {view_func.__name__}: {e}")
                return Response({
                    "success": False,
                    "error": "Validation error",
                    "details": str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        return wrapper
    return decorator


# ============================================================================
# Permission Helper Functions
# ============================================================================

def check_expense_permissions(user: Any, expense: Any, action: str) -> Dict[str, Any]:
    """
    Check if user has permission to perform action on expense
    
    Args:
        user: User requesting the action
        expense: Expense object
        action: Action to perform ('view', 'edit', 'delete', 'approve', 'reject')
        
    Returns:
        Dictionary with permission check result
    """
    # Admin can do everything
    if user.role == 'admin' or user.is_staff:
        return {"allowed": True}
    
    # Check based on action
    if action == 'view':
        # Owner can view their own
        if expense.owner == user:
            return {"allowed": True}
        
        # Manager can view team expenses
        if user.role == 'manager' and expense.owner.manager == user:
            return {"allowed": True}
        
        # Approvers can view expenses they need to approve
        if hasattr(expense, 'current_approver'):
            if expense.current_approver and expense.current_approver == user:
                return {"allowed": True}
    
    elif action in ['edit', 'delete']:
        # Only owner can edit/delete their own expenses (if not submitted)
        if expense.owner == user:
            if expense.status == 'draft':
                return {"allowed": True}
            else:
                return {"allowed": False, "reason": "Cannot edit submitted expenses"}
        
    elif action in ['approve', 'reject']:
        # Only current approver can approve/reject
        if hasattr(expense, 'current_approver'):
            if expense.current_approver and expense.current_approver == user:
                return {"allowed": True}
        
        return {"allowed": False, "reason": "You are not the assigned approver for this expense"}
    
    return {"allowed": False, "reason": "Insufficient permissions"}


def check_approval_rule_permissions(user: Any, company_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Check if user has permission to manage approval rules
    
    Args:
        user: User requesting the action
        company_id: Optional company ID for company-specific checks
        
    Returns:
        Dictionary with permission check result
    """
    # Only admins can manage approval rules
    if user.role == 'admin' or user.is_staff or user.is_superuser:
        return {"allowed": True}
    
    # Company admins might have limited access (future feature)
    if user.role == 'manager' and company_id:
        if user.company_id == company_id:
            return {"allowed": True, "limited": True}
    
    return {
        "allowed": False, 
        "reason": "Only administrators can manage approval rules"
    }


def check_user_management_permissions(requesting_user: Any, target_user: Any = None) -> Dict[str, Any]:
    """
    Check if user has permission to manage other users
    
    Args:
        requesting_user: User making the request
        target_user: Optional target user being managed
        
    Returns:
        Dictionary with permission check result
    """
    # Admin can manage all users
    if requesting_user.role == 'admin' or requesting_user.is_staff:
        return {"allowed": True}
    
    # Manager can manage users in their company (limited)
    if requesting_user.role == 'manager':
        if target_user and target_user.company == requesting_user.company:
            # Cannot manage other admins or managers
            if target_user.role in ['admin']:
                return {"allowed": False, "reason": "Cannot manage admin users"}
            return {"allowed": True, "limited": True}
    
    # Users can only manage themselves (limited actions)
    if target_user and target_user == requesting_user:
        return {"allowed": True, "self_only": True}
    
    return {
        "allowed": False,
        "reason": "Insufficient permissions to manage users"
    }


# ============================================================================
# Validation Error Response Helper
# ============================================================================

def create_validation_error_response(errors: Dict[str, Any], message: str = "Validation failed") -> Response:
    """
    Create standardized validation error response
    
    Args:
        errors: Dictionary of validation errors
        message: Error message
        
    Returns:
        DRF Response object with error details
    """
    return Response({
        "success": False,
        "error": message,
        "details": errors,
        "timestamp": datetime.now().isoformat()
    }, status=status.HTTP_400_BAD_REQUEST)


def create_permission_error_response(message: str, details: str = None) -> Response:
    """
    Create standardized permission error response
    
    Args:
        message: Error message
        details: Optional additional details
        
    Returns:
        DRF Response object with permission error
    """
    response_data = {
        "success": False,
        "error": message,
        "timestamp": datetime.now().isoformat()
    }
    
    if details:
        response_data["details"] = details
    
    return Response(response_data, status=status.HTTP_403_FORBIDDEN)