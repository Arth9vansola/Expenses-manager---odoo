"""
Enhanced Approval Rules Management API with Permissions and Validation
Provides secure approval rules CRUD operations with comprehensive permission checks and validation
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from .models import ApprovalRule, User, Company, Expense, Approval
from .permissions import (
    IsAdminUser, IsManagerOrAdmin,
    validate_approval_rule_data, validate_required_fields,
    check_approval_rule_permissions, require_permissions,
    validate_request_data, create_validation_error_response,
    create_permission_error_response
)

logger = logging.getLogger(__name__)

# ============================================================================
# Approval Rules Management API Endpoints
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def approval_rules_list_create(request):
    """
    List approval rules (GET) or create new approval rule (POST)
    
    Permissions:
    - GET: Admin sees all, Manager sees company rules
    - POST: Admin only
    """
    if request.method == 'GET':
        return list_approval_rules(request)
    elif request.method == 'POST':
        return create_approval_rule(request)


def list_approval_rules(request):
    """
    List approval rules based on user permissions
    """
    try:
        user = request.user
        
        # Check basic permissions
        permission_check = check_approval_rule_permissions(user)
        if not permission_check["allowed"]:
            return create_permission_error_response(
                "Permission denied",
                permission_check.get("reason", "Insufficient permissions to view approval rules")
            )
        
        # Determine which rules the user can see
        if user.role == 'admin' or user.is_staff:
            # Admin can see all rules
            rules_qs = ApprovalRule.objects.all()
            can_see_all = True
        else:
            # Manager can see company rules
            if user.company:
                rules_qs = ApprovalRule.objects.filter(company=user.company)
            else:
                rules_qs = ApprovalRule.objects.none()
            can_see_all = False
        
        # Apply filters
        company_id = request.GET.get('company_id')
        if company_id and can_see_all:
            rules_qs = rules_qs.filter(company_id=company_id)
        
        is_active = request.GET.get('is_active')
        if is_active is not None:
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            rules_qs = rules_qs.filter(is_active=is_active_bool)
        
        # Order by priority and creation date
        rules_qs = rules_qs.select_related('company', 'created_by').order_by('-priority', '-created_at')
        
        # Serialize rules
        rules_data = []
        for rule in rules_qs:
            rule_data = {
                'id': rule.id,
                'name': rule.name,
                'description': rule.description or '',
                'is_active': rule.is_active,
                'priority': rule.priority,
                'company': {
                    'id': rule.company.id,
                    'name': rule.company.name
                },
                'amount_range': {
                    'min_amount': float(rule.min_amount) if rule.min_amount else None,
                    'max_amount': float(rule.max_amount) if rule.max_amount else None
                },
                'approval_config': {
                    'approvers': rule.approvers or [],
                    'min_percentage_required': rule.min_percentage_required or 100,
                    'specific_approver': rule.specific_approver.id if rule.specific_approver else None,
                    'is_hybrid_rule': rule.is_hybrid_rule or False
                },
                'created_at': rule.created_at.isoformat(),
                'created_by': {
                    'id': rule.created_by.id if rule.created_by else None,
                    'name': f"{rule.created_by.first_name} {rule.created_by.last_name}" if rule.created_by else None
                } if rule.created_by else None,
                'permissions': {
                    'can_edit': user.role == 'admin' or user.is_staff,
                    'can_delete': user.role == 'admin' or user.is_staff,
                    'can_activate': user.role == 'admin' or user.is_staff
                }
            }
            
            # Add usage statistics for admin
            if can_see_all:
                expense_count = Expense.objects.filter(
                    approval_rule=rule
                ).distinct().count()
                rule_data['usage_stats'] = {
                    'expenses_processed': expense_count
                }
            
            rules_data.append(rule_data)
        
        return Response({
            "success": True,
            "message": f"Retrieved {len(rules_data)} approval rules",
            "data": {
                "approval_rules": rules_data,
                "total_count": len(rules_data),
                "permissions": {
                    "can_create": user.role == 'admin' or user.is_staff,
                    "can_see_all": can_see_all
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error listing approval rules: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve approval rules",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@require_permissions(allowed_roles=['admin', 'staff'])
@validate_request_data(validate_approval_rule_data, is_update=False)
def create_approval_rule(request):
    """
    Create a new approval rule (Admin only)
    """
    try:
        data = request.data
        user = request.user
        
        # Additional permission check
        permission_check = check_approval_rule_permissions(user)
        if not permission_check["allowed"]:
            return create_permission_error_response(
                "Permission denied",
                permission_check.get("reason", "Insufficient permissions")
            )
        
        with transaction.atomic():
            # Validate company exists and is active
            try:
                company = Company.objects.get(id=data['company_id'])
                if not company.is_active:
                    return create_validation_error_response({
                        'company_id': 'Cannot create rule for inactive company'
                    })
            except Company.DoesNotExist:
                return create_validation_error_response({
                    'company_id': 'Invalid company ID'
                })
            
            # Validate amount range
            amount_range = data['amount_range']
            if 'min_amount' in amount_range and 'max_amount' in amount_range:
                min_amount = Decimal(str(amount_range['min_amount']))
                max_amount = Decimal(str(amount_range['max_amount']))
                if max_amount < min_amount:
                    return create_validation_error_response({
                        'amount_range': 'Maximum amount must be greater than or equal to minimum amount'
                    })
            
            # Validate approval configuration
            approval_config = data['approval_config']
            validation_result = validate_approval_config(approval_config, company)
            if not validation_result["valid"]:
                return create_validation_error_response(validation_result["errors"])
            
            # Check for overlapping rules in the same company
            overlap_check = check_rule_overlaps(company, amount_range, exclude_rule_id=None)
            if overlap_check["has_overlap"]:
                return create_validation_error_response({
                    'amount_range': f'Amount range overlaps with existing rule: {overlap_check["conflicting_rule"]}'
                })
            
            # Create approval rule with correct field mapping
            rule_data = {
                'name': data['name'].strip(),
                'description': data.get('description', '').strip(),
                'company': company,
                'created_by': user,
                'priority': data.get('priority', 1),
                'is_active': data.get('is_active', True)
            }
            
            # Map amount range
            if 'min_amount' in amount_range:
                rule_data['min_amount'] = Decimal(str(amount_range['min_amount']))
            if 'max_amount' in amount_range:
                rule_data['max_amount'] = Decimal(str(amount_range['max_amount']))
            
            # Map approval config
            if 'approvers' in approval_config:
                rule_data['approvers'] = approval_config['approvers']
            if 'min_percentage_required' in approval_config:
                rule_data['min_percentage_required'] = approval_config['min_percentage_required']
            if 'specific_approver' in approval_config:
                rule_data['specific_approver_id'] = approval_config['specific_approver']
            if 'is_hybrid_rule' in approval_config:
                rule_data['is_hybrid_rule'] = approval_config['is_hybrid_rule']
            
            # Create the approval rule
            approval_rule = ApprovalRule.objects.create(**rule_data)
            
            # Return created rule data
            rule_data = serialize_approval_rule(approval_rule, user)
            
            logger.info(f"Approval rule created: {approval_rule.name} by {user.email}")
            
            return Response({
                "success": True,
                "message": "Approval rule created successfully",
                "data": {
                    "approval_rule": rule_data
                }
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        logger.error(f"Error creating approval rule: {e}")
        return Response({
            "success": False,
            "error": "Failed to create approval rule",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def approval_rule_detail(request, pk):
    """
    Get, update, or delete a specific approval rule
    """
    try:
        approval_rule = get_object_or_404(ApprovalRule, id=pk)
        
        # Check permissions based on method
        if request.method == 'GET':
            return get_approval_rule_detail(request, approval_rule)
        elif request.method == 'PUT':
            return update_approval_rule(request, approval_rule)
        elif request.method == 'DELETE':
            return delete_approval_rule(request, approval_rule)
            
    except ApprovalRule.DoesNotExist:
        return Response({
            "success": False,
            "error": "Approval rule not found",
            "details": f"No approval rule found with ID {pk}"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error in approval rule detail endpoint: {e}")
        return Response({
            "success": False,
            "error": "Internal server error",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_approval_rule_detail(request, approval_rule):
    """
    Get detailed information about a specific approval rule
    """
    # Check permissions
    permission_check = check_approval_rule_permissions(request.user, approval_rule.company.id)
    if not permission_check["allowed"]:
        return create_permission_error_response(
            "Permission denied",
            permission_check.get("reason", "You don't have permission to view this approval rule")
        )
    
    # Serialize rule with full details
    rule_data = serialize_approval_rule(approval_rule, request.user, include_full_details=True)
    
    return Response({
        "success": True,
        "message": "Approval rule details retrieved successfully",
        "data": {
            "approval_rule": rule_data
        }
    }, status=status.HTTP_200_OK)


@require_permissions(allowed_roles=['admin', 'staff'])
@validate_request_data(validate_approval_rule_data, is_update=True)
def update_approval_rule(request, approval_rule):
    """
    Update an approval rule (Admin only)
    """
    try:
        data = request.data
        user = request.user
        
        # Check if rule is in use
        if approval_rule.is_active:
            active_expenses = Expense.objects.filter(
                approval_rule=approval_rule,
                status='pending'
            ).exists()
            
            if active_expenses and any(key in data for key in ['amount_range', 'approval_config']):
                return create_validation_error_response({
                    'approval_rule': 'Cannot modify amount range or approval config while rule has pending expenses'
                })
        
        with transaction.atomic():
            # Update basic fields
            if 'name' in data:
                approval_rule.name = data['name'].strip()
            
            if 'description' in data:
                approval_rule.description = data['description'].strip()
            
            if 'priority' in data:
                approval_rule.priority = data['priority']
            
            if 'is_active' in data:
                approval_rule.is_active = data['is_active']
            
            # Update amount range (if allowed)
            if 'amount_range' in data:
                amount_range = data['amount_range']
                if 'min_amount' in amount_range and 'max_amount' in amount_range:
                    min_amount = Decimal(str(amount_range['min_amount']))
                    max_amount = Decimal(str(amount_range['max_amount']))
                    if max_amount < min_amount:
                        return create_validation_error_response({
                            'amount_range': 'Maximum amount must be greater than or equal to minimum amount'
                        })
                
                # Check for overlaps with other rules
                overlap_check = check_rule_overlaps(approval_rule.company, amount_range, exclude_rule_id=approval_rule.id)
                if overlap_check["has_overlap"]:
                    return create_validation_error_response({
                        'amount_range': f'Amount range overlaps with existing rule: {overlap_check["conflicting_rule"]}'
                    })
                
                # Map amount range to individual fields
                if 'min_amount' in amount_range:
                    approval_rule.min_amount = Decimal(str(amount_range['min_amount']))
                if 'max_amount' in amount_range:
                    approval_rule.max_amount = Decimal(str(amount_range['max_amount']))
            
            # Update approval config (if allowed)
            if 'approval_config' in data:
                approval_config = data['approval_config']
                validation_result = validate_approval_config(approval_config, approval_rule.company)
                if not validation_result["valid"]:
                    return create_validation_error_response(validation_result["errors"])
                
                # Map approval_config to individual fields
                if 'approvers' in approval_config:
                    approval_rule.approvers = approval_config['approvers']
                if 'min_percentage_required' in approval_config:
                    approval_rule.min_percentage_required = approval_config['min_percentage_required']
                if 'specific_approver' in approval_config:
                    approval_rule.specific_approver_id = approval_config['specific_approver']
                if 'is_hybrid_rule' in approval_config:
                    approval_rule.is_hybrid_rule = approval_config['is_hybrid_rule']
            
            approval_rule.save()
            
            # Return updated rule data
            rule_data = serialize_approval_rule(approval_rule, user, include_full_details=True)
            
            logger.info(f"Approval rule updated: {approval_rule.name} by {user.email}")
            
            return Response({
                "success": True,
                "message": "Approval rule updated successfully",
                "data": {
                    "approval_rule": rule_data
                }
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error updating approval rule: {e}")
        return Response({
            "success": False,
            "error": "Failed to update approval rule",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@require_permissions(allowed_roles=['admin', 'staff'])
def delete_approval_rule(request, approval_rule):
    """
    Delete an approval rule (Admin only)
    """
    try:
        user = request.user
        
        # Check if rule is in use
        expenses_using_rule = Expense.objects.filter(
            approval_rule=approval_rule
        ).count()
        
        if expenses_using_rule > 0:
            return create_validation_error_response({
                'approval_rule': f'Cannot delete rule that has been used in {expenses_using_rule} expenses. Deactivate instead.'
            })
        
        rule_name = approval_rule.name
        approval_rule.delete()
        
        logger.info(f"Approval rule deleted: {rule_name} by {user.email}")
        
        return Response({
            "success": True,
            "message": f"Approval rule '{rule_name}' deleted successfully",
            "data": {
                "deleted_rule_name": rule_name
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error deleting approval rule: {e}")
        return Response({
            "success": False,
            "error": "Failed to delete approval rule",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Approval Rule Validation API
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def validate_approval_rule(request):
    """
    Validate approval rule configuration without saving
    """
    try:
        data = request.data
        
        # Validate the data using our validation function
        validation_result = validate_approval_rule_data(data, is_update=False)
        
        if not validation_result["valid"]:
            return Response({
                "success": False,
                "message": "Validation failed",
                "data": {
                    "is_valid": False,
                    "errors": validation_result["errors"]
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Additional business logic validation
        additional_checks = []
        
        # Check company exists
        if 'company_id' in data:
            try:
                company = Company.objects.get(id=data['company_id'])
                if not company.is_active:
                    additional_checks.append({
                        "field": "company_id",
                        "message": "Company is not active"
                    })
            except Company.DoesNotExist:
                additional_checks.append({
                    "field": "company_id",
                    "message": "Company not found"
                })
        
        # Check for amount range overlaps
        if 'company_id' in data and 'amount_range' in data:
            try:
                company = Company.objects.get(id=data['company_id'])
                overlap_check = check_rule_overlaps(company, data['amount_range'])
                if overlap_check["has_overlap"]:
                    additional_checks.append({
                        "field": "amount_range",
                        "message": f"Amount range overlaps with existing rule: {overlap_check['conflicting_rule']}"
                    })
            except Company.DoesNotExist:
                pass
        
        # Validate approval config
        if 'approval_config' in data and 'company_id' in data:
            try:
                company = Company.objects.get(id=data['company_id'])
                config_validation = validate_approval_config(data['approval_config'], company)
                if not config_validation["valid"]:
                    for field, error in config_validation["errors"].items():
                        additional_checks.append({
                            "field": field,
                            "message": error
                        })
            except Company.DoesNotExist:
                pass
        
        is_valid = len(additional_checks) == 0
        
        return Response({
            "success": True,
            "message": "Validation completed",
            "data": {
                "is_valid": is_valid,
                "validation_checks": additional_checks if not is_valid else [],
                "validated_at": datetime.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error validating approval rule: {e}")
        return Response({
            "success": False,
            "error": "Validation error",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def approval_rule_templates(request):
    """
    Get pre-defined approval rule templates
    """
    try:
        templates = [
            {
                "name": "Simple Manager Approval",
                "description": "Single manager approval for all amounts",
                "amount_range": {
                    "min_amount": "0.00",
                    "max_amount": None
                },
                "approval_config": {
                    "type": "sequential",
                    "steps": [
                        {
                            "order": 1,
                            "min_required": 1,
                            "approvers": []
                        }
                    ]
                }
            },
            {
                "name": "Two-Level Approval",
                "description": "Manager then Director approval",
                "amount_range": {
                    "min_amount": "500.00",
                    "max_amount": "5000.00"
                },
                "approval_config": {
                    "type": "sequential",
                    "steps": [
                        {
                            "order": 1,
                            "min_required": 1,
                            "approvers": []
                        },
                        {
                            "order": 2,
                            "min_required": 1,
                            "approvers": []
                        }
                    ]
                }
            },
            {
                "name": "High Amount Multi-Approval",
                "description": "Multiple approvers required for high amounts",
                "amount_range": {
                    "min_amount": "5000.00",
                    "max_amount": None
                },
                "approval_config": {
                    "type": "sequential",
                    "steps": [
                        {
                            "order": 1,
                            "min_required": 2,
                            "approvers": []
                        },
                        {
                            "order": 2,
                            "min_required": 1,
                            "approvers": []
                        }
                    ]
                }
            }
        ]
        
        return Response({
            "success": True,
            "message": "Approval rule templates retrieved successfully",
            "data": {
                "templates": templates
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting approval rule templates: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve templates",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Helper Functions
# ============================================================================

def validate_approval_config(approval_config, company):
    """
    Validate approval configuration structure and approver assignments
    """
    try:
        errors = {}
        
        # Validate basic structure
        if not isinstance(approval_config, dict):
            return {"valid": False, "errors": {"approval_config": "Must be an object"}}
        
        # Validate approval type
        approval_type = approval_config.get('type', 'sequential')
        if approval_type not in ['sequential', 'parallel', 'any']:
            errors['approval_config.type'] = "Invalid approval type"
        
        # Validate steps
        steps = approval_config.get('steps', [])
        if not isinstance(steps, list) or len(steps) == 0:
            errors['approval_config.steps'] = "At least one approval step is required"
        else:
            # Get company users who can be approvers
            company_approvers = User.objects.filter(
                company=company,
                role__in=['manager', 'admin'],
                is_active=True
            ).values_list('id', flat=True)
            
            for i, step in enumerate(steps):
                if not isinstance(step, dict):
                    errors[f'approval_config.steps[{i}]'] = "Step must be an object"
                    continue
                
                # Validate order
                if 'order' not in step or not isinstance(step['order'], int) or step['order'] < 1:
                    errors[f'approval_config.steps[{i}].order'] = "Valid order is required"
                
                # Validate approvers
                approvers = step.get('approvers', [])
                if not isinstance(approvers, list) or len(approvers) == 0:
                    errors[f'approval_config.steps[{i}].approvers'] = "At least one approver is required"
                else:
                    for j, approver_id in enumerate(approvers):
                        if approver_id not in company_approvers:
                            errors[f'approval_config.steps[{i}].approvers[{j}]'] = f"Invalid or unauthorized approver ID: {approver_id}"
                
                # Validate min_required
                min_required = step.get('min_required', 1)
                if not isinstance(min_required, int) or min_required < 1:
                    errors[f'approval_config.steps[{i}].min_required'] = "Minimum required must be a positive integer"
                elif min_required > len(approvers):
                    errors[f'approval_config.steps[{i}].min_required'] = "Minimum required cannot exceed number of approvers"
        
        return {"valid": len(errors) == 0, "errors": errors}
        
    except Exception as e:
        logger.error(f"Error validating approval config: {e}")
        return {"valid": False, "errors": {"approval_config": "Validation error"}}


def check_rule_overlaps(company, amount_range, exclude_rule_id=None):
    """
    Check if amount range overlaps with existing active rules
    """
    try:
        min_amount = Decimal(str(amount_range.get('min_amount', 0)))
        max_amount = amount_range.get('max_amount')
        max_amount = Decimal(str(max_amount)) if max_amount is not None else None
        
        # Get existing active rules for the company
        existing_rules = ApprovalRule.objects.filter(
            company=company,
            is_active=True
        )
        
        if exclude_rule_id:
            existing_rules = existing_rules.exclude(id=exclude_rule_id)
        
        for rule in existing_rules:
            existing_range = rule.amount_range or {}
            existing_min = Decimal(str(existing_range.get('min_amount', 0)))
            existing_max = existing_range.get('max_amount')
            existing_max = Decimal(str(existing_max)) if existing_max is not None else None
            
            # Check for overlap
            overlap = False
            
            if max_amount is None and existing_max is None:
                # Both have no upper limit - check if ranges overlap
                overlap = True
            elif max_amount is None:
                # New rule has no upper limit - check if it starts within existing range
                overlap = min_amount <= existing_max
            elif existing_max is None:
                # Existing rule has no upper limit - check if new range overlaps
                overlap = max_amount >= existing_min
            else:
                # Both have upper limits - check standard overlap
                overlap = not (max_amount < existing_min or min_amount > existing_max)
            
            if overlap:
                return {
                    "has_overlap": True,
                    "conflicting_rule": rule.name
                }
        
        return {"has_overlap": False}
        
    except Exception as e:
        logger.error(f"Error checking rule overlaps: {e}")
        return {"has_overlap": False}


def serialize_approval_rule(approval_rule, requesting_user, include_full_details=False):
    """
    Serialize approval rule for API response
    """
    data = {
        'id': approval_rule.id,
        'name': approval_rule.name,
        'description': approval_rule.description or '',
        'is_active': approval_rule.is_active,
        'priority': approval_rule.priority,
        'company': {
            'id': approval_rule.company.id,
            'name': approval_rule.company.name
        },
        'amount_range': approval_rule.amount_range or {},
        'approval_config': approval_rule.approval_config or {},
        'created_at': approval_rule.created_at.isoformat(),
        'updated_at': approval_rule.updated_at.isoformat()
    }
    
    # Add creator info
    if approval_rule.created_by:
        data['created_by'] = {
            'id': approval_rule.created_by.id,
            'name': f"{approval_rule.created_by.first_name} {approval_rule.created_by.last_name}",
            'email': approval_rule.created_by.email
        }
    
    # Add detailed information if requested
    if include_full_details:
        # Usage statistics
        expenses_count = Expense.objects.filter(
            approval_rule=approval_rule
        ).distinct().count()
        
        pending_count = Expense.objects.filter(
            approval_rule=approval_rule,
            status='pending'
        ).distinct().count()
        
        data['usage_stats'] = {
            'total_expenses_processed': expenses_count,
            'pending_expenses': pending_count
        }
        
        # Expand approver details in steps
        if 'steps' in data['approval_config']:
            for step in data['approval_config']['steps']:
                if 'approvers' in step:
                    approvers_details = []
                    approvers = User.objects.filter(id__in=step['approvers'])
                    for approver in approvers:
                        approvers_details.append({
                            'id': approver.id,
                            'name': f"{approver.first_name} {approver.last_name}",
                            'email': approver.email,
                            'role': approver.role
                        })
                    step['approvers_details'] = approvers_details
    
    # Add permissions
    is_admin = requesting_user.role == 'admin' or requesting_user.is_staff
    data['permissions'] = {
        'can_edit': is_admin,
        'can_delete': is_admin,
        'can_activate': is_admin
    }
    
    return data