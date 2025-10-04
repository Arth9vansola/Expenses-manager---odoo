"""
Enhanced User Management API with Permissions and Validation
Provides secure user CRUD operations with comprehensive permission checks
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from .models import User, Company
from .permissions import (
    IsAdminUser, IsManagerOrAdmin, IsOwnerOrAdmin,
    validate_user_data, validate_required_fields,
    check_user_management_permissions, require_permissions,
    validate_request_data, create_validation_error_response,
    create_permission_error_response
)

logger = logging.getLogger(__name__)

UserModel = get_user_model()

# ============================================================================
# User Management API Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def users_list_create(request):
    """
    List all users (GET) or create new user (POST)
    
    Permissions:
    - GET: Admin can see all, Manager can see company users, Employee can see self
    - POST: Admin only
    """
    if request.method == 'GET':
        return list_users(request)
    elif request.method == 'POST':
        return create_user(request)


def list_users(request):
    """
    List users based on requesting user's permissions
    """
    try:
        user = request.user
        
        # Determine which users the requesting user can see
        if user.role == 'admin' or user.is_staff:
            # Admin can see all users
            users = User.objects.all().select_related('company', 'manager')
            can_see_all = True
        elif user.role == 'manager':
            # Manager can see users in their company
            users = User.objects.filter(company=user.company).select_related('company', 'manager')
            can_see_all = False
        else:
            # Employee can only see themselves
            users = User.objects.filter(id=user.id).select_related('company', 'manager')
            can_see_all = False
        
        # Apply filters if provided
        company_id = request.GET.get('company_id')
        role = request.GET.get('role')
        is_active = request.GET.get('is_active')
        
        if company_id and can_see_all:
            users = users.filter(company_id=company_id)
        
        if role:
            users = users.filter(role=role)
        
        if is_active is not None:
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            users = users.filter(is_active=is_active_bool)
        
        # Serialize users
        users_data = []
        for user_obj in users:
            users_data.append({
                'id': user_obj.id,
                'email': user_obj.email,
                'first_name': user_obj.first_name,
                'last_name': user_obj.last_name,
                'role': user_obj.role,
                'is_active': user_obj.is_active,
                'company': {
                    'id': user_obj.company.id if user_obj.company else None,
                    'name': user_obj.company.name if user_obj.company else None
                } if user_obj.company else None,
                'manager': {
                    'id': user_obj.manager.id if user_obj.manager else None,
                    'name': f"{user_obj.manager.first_name} {user_obj.manager.last_name}" if user_obj.manager else None
                } if user_obj.manager else None,
                'date_joined': user_obj.date_joined.isoformat() if user_obj.date_joined else None,
                'last_login': user_obj.last_login.isoformat() if user_obj.last_login else None
            })
        
        return Response({
            "success": True,
            "message": f"Retrieved {len(users_data)} users",
            "data": {
                "users": users_data,
                "total_count": len(users_data),
                "permissions": {
                    "can_create": user.role == 'admin' or user.is_staff,
                    "can_see_all": can_see_all
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve users",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@require_permissions(allowed_roles=['admin', 'staff'])
@validate_request_data(validate_user_data, is_update=False)
def create_user(request):
    """
    Create a new user (Admin only)
    """
    try:
        data = request.data
        
        # Additional permission check
        permission_check = check_user_management_permissions(request.user)
        if not permission_check["allowed"]:
            return create_permission_error_response(
                "Permission denied", 
                permission_check.get("reason", "Insufficient permissions")
            )
        
        with transaction.atomic():
            # Create user
            user_data = {
                'email': data['email'].lower().strip(),
                'first_name': data['first_name'].strip(),
                'last_name': data['last_name'].strip(),
                'role': data['role'],
                'is_active': data.get('is_active', True)
            }
            
            # Set password (generate temporary if not provided)
            password = data.get('password', 'TempPass123!')
            user_data['password'] = make_password(password)
            
            # Handle company assignment
            if 'company_id' in data:
                try:
                    company = Company.objects.get(id=data['company_id'])
                    user_data['company'] = company
                except Company.DoesNotExist:
                    return create_validation_error_response({
                        'company_id': 'Invalid company ID'
                    })
            
            # Create the user
            user = User.objects.create(**user_data)
            
            # Handle manager assignment
            if 'manager_id' in data and data['manager_id']:
                try:
                    manager = User.objects.get(id=data['manager_id'])
                    if manager.role in ['manager', 'admin'] and manager.company == user.company:
                        user.manager = manager
                        user.save()
                    else:
                        return create_validation_error_response({
                            'manager_id': 'Manager must be in same company with manager/admin role'
                        })
                except User.DoesNotExist:
                    return create_validation_error_response({
                        'manager_id': 'Invalid manager ID'
                    })
            
            # Return created user data
            user_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': user.is_active,
                'company': {
                    'id': user.company.id if user.company else None,
                    'name': user.company.name if user.company else None
                } if user.company else None,
                'manager': {
                    'id': user.manager.id if user.manager else None,
                    'name': f"{user.manager.first_name} {user.manager.last_name}" if user.manager else None
                } if user.manager else None,
                'date_joined': user.date_joined.isoformat()
            }
            
            logger.info(f"User created: {user.email} by {request.user.email}")
            
            return Response({
                "success": True,
                "message": "User created successfully",
                "data": {
                    "user": user_data,
                    "temporary_password": password if 'password' not in data else None
                }
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return Response({
            "success": False,
            "error": "Failed to create user",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_detail(request, pk):
    """
    Get, update, or delete a specific user
    
    Permissions:
    - GET: Admin/Manager can see company users, Employee can see self
    - PUT: Admin can update all, Manager can update company users (limited), User can update self (limited)
    - DELETE: Admin only
    """
    try:
        user_obj = get_object_or_404(User, id=pk)
        
        # Check permissions based on method
        if request.method == 'GET':
            return get_user_detail(request, user_obj)
        elif request.method == 'PUT':
            return update_user(request, user_obj)
        elif request.method == 'DELETE':
            return delete_user(request, user_obj)
            
    except User.DoesNotExist:
        return Response({
            "success": False,
            "error": "User not found",
            "details": f"No user found with ID {pk}"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in user detail endpoint: {e}")
        return Response({
            "success": False,
            "error": "Internal server error",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_user_detail(request, user_obj):
    """
    Get detailed information about a specific user
    """
    # Check permissions
    permission_check = check_user_management_permissions(request.user, user_obj)
    if not permission_check["allowed"]:
        return create_permission_error_response(
            "Permission denied",
            permission_check.get("reason", "You don't have permission to view this user")
        )
    
    # Determine what information can be shown
    is_self = user_obj == request.user
    is_admin = request.user.role == 'admin' or request.user.is_staff
    
    user_data = {
        'id': user_obj.id,
        'email': user_obj.email,
        'first_name': user_obj.first_name,
        'last_name': user_obj.last_name,
        'role': user_obj.role,
        'is_active': user_obj.is_active,
        'date_joined': user_obj.date_joined.isoformat() if user_obj.date_joined else None
    }
    
    # Add additional fields based on permissions
    if is_admin or is_self:
        user_data.update({
            'last_login': user_obj.last_login.isoformat() if user_obj.last_login else None,
            'company': {
                'id': user_obj.company.id if user_obj.company else None,
                'name': user_obj.company.name if user_obj.company else None
            } if user_obj.company else None,
            'manager': {
                'id': user_obj.manager.id if user_obj.manager else None,
                'name': f"{user_obj.manager.first_name} {user_obj.manager.last_name}" if user_obj.manager else None,
                'email': user_obj.manager.email if user_obj.manager else None
            } if user_obj.manager else None
        })
    
    # Add permissions information
    user_permissions = {
        'can_edit': is_admin or is_self,
        'can_delete': is_admin,
        'can_change_role': is_admin,
        'can_change_company': is_admin
    }
    
    return Response({
        "success": True,
        "message": "User details retrieved successfully",
        "data": {
            "user": user_data,
            "permissions": user_permissions
        }
    }, status=status.HTTP_200_OK)


@validate_request_data(validate_user_data, is_update=True)
def update_user(request, user_obj):
    """
    Update user information based on permissions
    """
    # Check permissions
    permission_check = check_user_management_permissions(request.user, user_obj)
    if not permission_check["allowed"]:
        return create_permission_error_response(
            "Permission denied",
            permission_check.get("reason", "You don't have permission to update this user")
        )
    
    try:
        data = request.data
        is_admin = request.user.role == 'admin' or request.user.is_staff
        is_self = user_obj == request.user
        
        with transaction.atomic():
            # Fields that can be updated by self
            if 'first_name' in data:
                user_obj.first_name = data['first_name'].strip()
            if 'last_name' in data:
                user_obj.last_name = data['last_name'].strip()
            
            # Admin-only fields
            if is_admin:
                if 'email' in data:
                    user_obj.email = data['email'].lower().strip()
                if 'role' in data:
                    user_obj.role = data['role']
                if 'is_active' in data:
                    user_obj.is_active = data['is_active']
                
                # Handle company assignment
                if 'company_id' in data:
                    if data['company_id']:
                        try:
                            company = Company.objects.get(id=data['company_id'])
                            user_obj.company = company
                        except Company.DoesNotExist:
                            return create_validation_error_response({
                                'company_id': 'Invalid company ID'
                            })
                    else:
                        user_obj.company = None
                
                # Handle manager assignment
                if 'manager_id' in data:
                    if data['manager_id']:
                        try:
                            manager = User.objects.get(id=data['manager_id'])
                            if manager.role in ['manager', 'admin']:
                                user_obj.manager = manager
                            else:
                                return create_validation_error_response({
                                    'manager_id': 'Manager must have manager or admin role'
                                })
                        except User.DoesNotExist:
                            return create_validation_error_response({
                                'manager_id': 'Invalid manager ID'
                            })
                    else:
                        user_obj.manager = None
            
            # Password update (admin or self with current password)
            if 'password' in data:
                if is_admin or (is_self and 'current_password' in data):
                    if is_self and not is_admin:
                        # Verify current password for self-updates
                        if not user_obj.check_password(data['current_password']):
                            return create_validation_error_response({
                                'current_password': 'Current password is incorrect'
                            })
                    
                    user_obj.password = make_password(data['password'])
            
            user_obj.save()
            
            # Return updated user data
            updated_data = {
                'id': user_obj.id,
                'email': user_obj.email,
                'first_name': user_obj.first_name,
                'last_name': user_obj.last_name,
                'role': user_obj.role,
                'is_active': user_obj.is_active,
                'company': {
                    'id': user_obj.company.id if user_obj.company else None,
                    'name': user_obj.company.name if user_obj.company else None
                } if user_obj.company else None,
                'manager': {
                    'id': user_obj.manager.id if user_obj.manager else None,
                    'name': f"{user_obj.manager.first_name} {user_obj.manager.last_name}" if user_obj.manager else None
                } if user_obj.manager else None
            }
            
            logger.info(f"User updated: {user_obj.email} by {request.user.email}")
            
            return Response({
                "success": True,
                "message": "User updated successfully",
                "data": {
                    "user": updated_data
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        return Response({
            "success": False,
            "error": "Failed to update user",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@require_permissions(allowed_roles=['admin', 'staff'])
def delete_user(request, user_obj):
    """
    Delete a user (Admin only)
    """
    try:
        # Additional safety checks
        if user_obj == request.user:
            return create_validation_error_response({
                'user_id': 'Cannot delete your own account'
            })
        
        if user_obj.role == 'admin' and not request.user.is_superuser:
            return create_validation_error_response({
                'user_id': 'Cannot delete admin users unless you are a superuser'
            })
        
        # Check if user has any expenses
        expense_count = user_obj.expense_set.count() if hasattr(user_obj, 'expense_set') else 0
        
        user_email = user_obj.email
        user_name = f"{user_obj.first_name} {user_obj.last_name}"
        
        # Soft delete vs hard delete based on data
        if expense_count > 0:
            # Soft delete - deactivate user
            user_obj.is_active = False
            user_obj.email = f"deleted_{user_obj.id}_{user_obj.email}"
            user_obj.save()
            
            logger.info(f"User soft deleted: {user_email} by {request.user.email}")
            
            return Response({
                "success": True,
                "message": f"User '{user_name}' has been deactivated (has {expense_count} expenses)",
                "data": {
                    "action": "deactivated",
                    "reason": "User has existing expenses"
                }
            }, status=status.HTTP_200_OK)
        else:
            # Hard delete
            user_obj.delete()
            
            logger.info(f"User hard deleted: {user_email} by {request.user.email}")
            
            return Response({
                "success": True,
                "message": f"User '{user_name}' has been permanently deleted",
                "data": {
                    "action": "deleted"
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        return Response({
            "success": False,
            "error": "Failed to delete user",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# User Role and Permission Management
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_roles(request):
    """
    Get available user roles and current user's permissions
    """
    try:
        # Available roles
        roles = [
            {
                'value': 'employee',
                'label': 'Employee',
                'description': 'Can submit and manage own expenses'
            },
            {
                'value': 'manager',
                'label': 'Manager',
                'description': 'Can approve expenses and manage team members'
            },
            {
                'value': 'admin',
                'label': 'Administrator',
                'description': 'Full system access and user management'
            }
        ]
        
        # Current user permissions
        user = request.user
        permissions = {
            'can_create_users': user.role == 'admin' or user.is_staff,
            'can_manage_approval_rules': user.role == 'admin' or user.is_staff,
            'can_view_all_expenses': user.role in ['admin', 'manager'] or user.is_staff,
            'can_approve_expenses': user.role in ['admin', 'manager'],
            'current_role': user.role
        }
        
        return Response({
            "success": True,
            "message": "User roles and permissions retrieved successfully",
            "data": {
                "roles": roles,
                "current_user_permissions": permissions
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting user roles: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve user roles",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_profile(request):
    """
    Get current user's profile and permissions
    """
    try:
        user = request.user
        
        profile_data = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'company': {
                'id': user.company.id if user.company else None,
                'name': user.company.name if user.company else None
            } if user.company else None,
            'manager': {
                'id': user.manager.id if user.manager else None,
                'name': f"{user.manager.first_name} {user.manager.last_name}" if user.manager else None,
                'email': user.manager.email if user.manager else None
            } if user.manager else None
        }
        
        # User permissions
        permissions = {
            'can_create_users': user.role == 'admin' or user.is_staff,
            'can_manage_approval_rules': user.role == 'admin' or user.is_staff,
            'can_view_all_expenses': user.role in ['admin', 'manager'] or user.is_staff,
            'can_approve_expenses': user.role in ['admin', 'manager'],
            'can_manage_company': user.role == 'admin' or user.is_staff
        }
        
        return Response({
            "success": True,
            "message": "Current user profile retrieved successfully",
            "data": {
                "profile": profile_data,
                "permissions": permissions
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting current user profile: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve user profile",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)