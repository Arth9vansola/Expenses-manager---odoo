"""
Step 14: Approval Rule Configuration API
Comprehensive CRUD endpoints for managing approval rules with advanced configuration
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from decimal import Decimal
import uuid

from .models import ApprovalRule, User, Company


class ApprovalRuleListCreateView(APIView):
    """
    GET /api/approval-rules/
    POST /api/approval-rules/
    
    Comprehensive approval rule management with advanced configuration options
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get all approval rules for the user's company
        
        Features:
        - Company-scoped rules
        - Ordered by priority and creation date
        - Rich metadata and configuration details
        - Filter by active status (optional)
        """
        try:
            user = request.user
            
            # Only admins and managers can view approval rules
            if user.role not in ['admin', 'manager']:
                return Response({
                    'error': 'Insufficient permissions to view approval rules'
                }, status=status.HTTP_403_FORBIDDEN)

            # Get query parameters
            show_inactive = request.query_params.get('show_inactive', 'false').lower() == 'true'
            category_filter = request.query_params.get('category')
            min_amount = request.query_params.get('min_amount')
            max_amount = request.query_params.get('max_amount')

            # Base queryset - company scoped
            rules_queryset = ApprovalRule.objects.filter(company=user.company)
            
            # Apply filters
            if not show_inactive:
                rules_queryset = rules_queryset.filter(is_active=True)
                
            if category_filter:
                rules_queryset = rules_queryset.filter(categories__contains=[category_filter])
                
            if min_amount:
                try:
                    min_amt = Decimal(min_amount)
                    rules_queryset = rules_queryset.filter(min_amount__gte=min_amt)
                except (ValueError, TypeError):
                    pass
                    
            if max_amount:
                try:
                    max_amt = Decimal(max_amount)
                    rules_queryset = rules_queryset.filter(max_amount__lte=max_amt)
                except (ValueError, TypeError):
                    pass

            # Order by priority (desc) and creation date
            rules = rules_queryset.order_by('-priority', '-created_at')

            # Serialize rules with rich details
            serialized_rules = []
            for rule in rules:
                rule_data = {
                    'id': str(rule.id),
                    'name': rule.name,
                    'description': rule.description,
                    'priority': rule.priority,
                    'is_active': rule.is_active,
                    
                    # Amount configuration
                    'amount_range': {
                        'min_amount': str(rule.min_amount) if rule.min_amount else None,
                        'max_amount': str(rule.max_amount) if rule.max_amount else None,
                        'currency': 'USD'  # Could be made configurable
                    },
                    
                    # Approval configuration
                    'approval_config': {
                        'approvers': rule.approvers or [],
                        'min_percentage_required': rule.min_percentage_required,
                        'specific_approver': {
                            'id': str(rule.specific_approver.id) if rule.specific_approver else None,
                            'name': rule.specific_approver.get_full_name() if rule.specific_approver else None,
                            'email': rule.specific_approver.email if rule.specific_approver else None,
                            'role': rule.specific_approver.role if rule.specific_approver else None
                        } if rule.specific_approver else None,
                        'is_hybrid_rule': rule.is_hybrid_rule
                    },
                    
                    # Rule conditions
                    'conditions': {
                        'categories': rule.categories or [],
                        'departments': rule.departments or []
                    },
                    
                    # Metadata
                    'metadata': {
                        'created_at': rule.created_at.isoformat(),
                        'updated_at': rule.updated_at.isoformat(),
                        'created_by': {
                            'id': str(rule.created_by.id) if rule.created_by else None,
                            'name': rule.created_by.get_full_name() if rule.created_by else None
                        } if rule.created_by else None
                    },
                    
                    # Usage statistics (could be expanded)
                    'usage_stats': {
                        'total_expenses_processed': 0,  # TODO: Implement actual counting
                        'avg_approval_time': None,      # TODO: Implement time tracking
                        'approval_success_rate': None   # TODO: Implement success rate
                    }
                }
                serialized_rules.append(rule_data)

            return Response({
                'approval_rules': serialized_rules,
                'total_count': len(serialized_rules),
                'filters_applied': {
                    'show_inactive': show_inactive,
                    'category_filter': category_filter,
                    'amount_range': {
                        'min_amount': min_amount,
                        'max_amount': max_amount
                    }
                },
                'company': {
                    'id': str(user.company.id),
                    'name': user.company.name
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to retrieve approval rules: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def post(self, request):
        """
        Create new approval rule or update existing one
        
        Features:
        - Create new rules with full configuration
        - Update existing rules (upsert by name)
        - Ordered approver lists with role-based configuration
        - Percentage-based approval thresholds
        - Specific approver assignments
        - Hybrid rule configurations
        - Priority and ordering management
        """
        try:
            user = request.user
            
            # Only admins can create/update approval rules
            if user.role != 'admin':
                return Response({
                    'error': 'Only administrators can create or update approval rules'
                }, status=status.HTTP_403_FORBIDDEN)

            data = request.data

            # Validate required fields
            required_fields = ['name', 'approval_config']
            for field in required_fields:
                if field not in data:
                    return Response({
                        'error': f'Missing required field: {field}'
                    }, status=status.HTTP_400_BAD_REQUEST)

            rule_name = data['name']
            
            # Check if rule already exists (update scenario)
            existing_rule = None
            rule_id = data.get('id')
            if rule_id:
                try:
                    existing_rule = ApprovalRule.objects.get(id=uuid.UUID(rule_id), company=user.company)
                except ApprovalRule.DoesNotExist:
                    return Response({
                        'error': f'Approval rule with ID {rule_id} not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # Check by name for upsert
                try:
                    existing_rule = ApprovalRule.objects.get(name=rule_name, company=user.company)
                except ApprovalRule.DoesNotExist:
                    pass

            # Validate approval configuration
            approval_config = data['approval_config']
            
            # Validate approvers list
            approvers = approval_config.get('approvers', [])
            if not isinstance(approvers, list):
                return Response({
                    'error': 'approvers must be a list'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate each approver in the list
            validated_approvers = []
            for i, approver in enumerate(approvers):
                if not isinstance(approver, dict):
                    return Response({
                        'error': f'Approver at index {i} must be a dictionary'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate approver fields
                if 'role' in approver:
                    if approver['role'] not in ['manager', 'admin']:
                        return Response({
                            'error': f'Invalid role "{approver["role"]}" at approver index {i}. Must be "manager" or "admin"'
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                if 'user_id' in approver:
                    try:
                        user_obj = User.objects.get(id=uuid.UUID(approver['user_id']), company=user.company)
                        approver['user_name'] = user_obj.get_full_name()
                        approver['user_email'] = user_obj.email
                    except (User.DoesNotExist, ValueError):
                        return Response({
                            'error': f'Invalid user_id at approver index {i}'
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                validated_approvers.append(approver)

            # Validate percentage requirement
            min_percentage = approval_config.get('min_percentage_required', 100)
            if not isinstance(min_percentage, int) or min_percentage < 1 or min_percentage > 100:
                return Response({
                    'error': 'min_percentage_required must be an integer between 1 and 100'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate specific approver if provided
            specific_approver = None
            if approval_config.get('specific_approver_id'):
                try:
                    specific_approver = User.objects.get(
                        id=uuid.UUID(approval_config['specific_approver_id']),
                        company=user.company
                    )
                    if specific_approver.role not in ['manager', 'admin']:
                        return Response({
                            'error': 'Specific approver must be a manager or admin'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except (User.DoesNotExist, ValueError):
                    return Response({
                        'error': 'Invalid specific_approver_id'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Validate amount range
            amount_range = data.get('amount_range', {})
            min_amount = None
            max_amount = None
            
            if 'min_amount' in amount_range and amount_range['min_amount'] is not None:
                try:
                    min_amount = Decimal(str(amount_range['min_amount']))
                    if min_amount < 0:
                        return Response({
                            'error': 'min_amount cannot be negative'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({
                        'error': 'Invalid min_amount format'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if 'max_amount' in amount_range and amount_range['max_amount'] is not None:
                try:
                    max_amount = Decimal(str(amount_range['max_amount']))
                    if max_amount < 0:
                        return Response({
                            'error': 'max_amount cannot be negative'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except (ValueError, TypeError):
                    return Response({
                        'error': 'Invalid max_amount format'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Validate amount range consistency
            if min_amount is not None and max_amount is not None and min_amount > max_amount:
                return Response({
                    'error': 'min_amount cannot be greater than max_amount'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate conditions
            conditions = data.get('conditions', {})
            categories = conditions.get('categories', [])
            departments = conditions.get('departments', [])
            
            if not isinstance(categories, list):
                return Response({
                    'error': 'categories must be a list'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if not isinstance(departments, list):
                return Response({
                    'error': 'departments must be a list'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create or update approval rule
            rule_data = {
                'company': user.company,
                'name': rule_name,
                'description': data.get('description', ''),
                'approvers': validated_approvers,
                'min_percentage_required': min_percentage,
                'specific_approver': specific_approver,
                'is_hybrid_rule': approval_config.get('is_hybrid_rule', False),
                'min_amount': min_amount,
                'max_amount': max_amount,
                'categories': categories,
                'departments': departments,
                'is_active': data.get('is_active', True),
                'priority': data.get('priority', 0),
                'created_by': user
            }

            if existing_rule:
                # Update existing rule
                for key, value in rule_data.items():
                    if key != 'company':  # Don't update company
                        setattr(existing_rule, key, value)
                existing_rule.save()
                
                created = False
                approval_rule = existing_rule
                action = 'updated'
            else:
                # Create new rule
                approval_rule = ApprovalRule.objects.create(**rule_data)
                created = True
                action = 'created'

            # Return detailed response
            response_data = {
                'message': f'Approval rule "{rule_name}" {action} successfully',
                'approval_rule': {
                    'id': str(approval_rule.id),
                    'name': approval_rule.name,
                    'description': approval_rule.description,
                    'priority': approval_rule.priority,
                    'is_active': approval_rule.is_active,
                    
                    'amount_range': {
                        'min_amount': str(approval_rule.min_amount) if approval_rule.min_amount else None,
                        'max_amount': str(approval_rule.max_amount) if approval_rule.max_amount else None
                    },
                    
                    'approval_config': {
                        'approvers': approval_rule.approvers,
                        'min_percentage_required': approval_rule.min_percentage_required,
                        'specific_approver': {
                            'id': str(approval_rule.specific_approver.id) if approval_rule.specific_approver else None,
                            'name': approval_rule.specific_approver.get_full_name() if approval_rule.specific_approver else None,
                            'email': approval_rule.specific_approver.email if approval_rule.specific_approver else None
                        } if approval_rule.specific_approver else None,
                        'is_hybrid_rule': approval_rule.is_hybrid_rule
                    },
                    
                    'conditions': {
                        'categories': approval_rule.categories,
                        'departments': approval_rule.departments
                    },
                    
                    'created_at': approval_rule.created_at.isoformat(),
                    'updated_at': approval_rule.updated_at.isoformat()
                },
                'action': action,
                'created': created
            }

            return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to create/update approval rule: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ApprovalRuleDetailView(APIView):
    """
    GET /api/approval-rules/{rule_id}/
    PUT /api/approval-rules/{rule_id}/
    DELETE /api/approval-rules/{rule_id}/
    
    Individual approval rule management
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, rule_id):
        """Get detailed information about a specific approval rule"""
        try:
            user = request.user
            
            if user.role not in ['admin', 'manager']:
                return Response({
                    'error': 'Insufficient permissions to view approval rule details'
                }, status=status.HTTP_403_FORBIDDEN)

            approval_rule = get_object_or_404(ApprovalRule, id=rule_id, company=user.company)

            # Get usage statistics (placeholder for future implementation)
            # TODO: Implement actual usage tracking
            usage_stats = {
                'total_expenses_processed': 0,
                'expenses_approved': 0,
                'expenses_rejected': 0,
                'avg_approval_time_hours': None,
                'current_pending_count': 0,
                'last_used': None
            }

            response_data = {
                'approval_rule': {
                    'id': str(approval_rule.id),
                    'name': approval_rule.name,
                    'description': approval_rule.description,
                    'priority': approval_rule.priority,
                    'is_active': approval_rule.is_active,
                    
                    'amount_range': {
                        'min_amount': str(approval_rule.min_amount) if approval_rule.min_amount else None,
                        'max_amount': str(approval_rule.max_amount) if approval_rule.max_amount else None,
                        'currency': 'USD'
                    },
                    
                    'approval_config': {
                        'approvers': approval_rule.approvers or [],
                        'min_percentage_required': approval_rule.min_percentage_required,
                        'specific_approver': {
                            'id': str(approval_rule.specific_approver.id) if approval_rule.specific_approver else None,
                            'name': approval_rule.specific_approver.get_full_name() if approval_rule.specific_approver else None,
                            'email': approval_rule.specific_approver.email if approval_rule.specific_approver else None,
                            'role': approval_rule.specific_approver.role if approval_rule.specific_approver else None
                        } if approval_rule.specific_approver else None,
                        'is_hybrid_rule': approval_rule.is_hybrid_rule
                    },
                    
                    'conditions': {
                        'categories': approval_rule.categories or [],
                        'departments': approval_rule.departments or []
                    },
                    
                    'metadata': {
                        'created_at': approval_rule.created_at.isoformat(),
                        'updated_at': approval_rule.updated_at.isoformat(),
                        'created_by': {
                            'id': str(approval_rule.created_by.id) if approval_rule.created_by else None,
                            'name': approval_rule.created_by.get_full_name() if approval_rule.created_by else None,
                            'email': approval_rule.created_by.email if approval_rule.created_by else None
                        } if approval_rule.created_by else None
                    },
                    
                    'usage_statistics': usage_stats
                }
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to retrieve approval rule: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def put(self, request, rule_id):
        """Update a specific approval rule"""
        try:
            user = request.user
            
            if user.role != 'admin':
                return Response({
                    'error': 'Only administrators can update approval rules'
                }, status=status.HTTP_403_FORBIDDEN)

            approval_rule = get_object_or_404(ApprovalRule, id=rule_id, company=user.company)
            
            # Use the same validation logic as POST
            # Create a temporary request with the rule ID to reuse POST logic
            temp_data = request.data.copy()
            temp_data['id'] = str(rule_id)
            
            # Create a mock request with the modified data
            class MockRequest:
                def __init__(self, data, user):
                    self.data = data
                    self.user = user
            
            mock_request = MockRequest(temp_data, user)
            
            # Use POST method for validation and update
            return self.post(mock_request)

        except Exception as e:
            return Response({
                'error': f'Failed to update approval rule: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def delete(self, request, rule_id):
        """Delete (soft delete) an approval rule"""
        try:
            user = request.user
            
            if user.role != 'admin':
                return Response({
                    'error': 'Only administrators can delete approval rules'
                }, status=status.HTTP_403_FORBIDDEN)

            approval_rule = get_object_or_404(ApprovalRule, id=rule_id, company=user.company)

            # Soft delete by setting is_active to False
            approval_rule.is_active = False
            approval_rule.save()

            return Response({
                'message': f'Approval rule "{approval_rule.name}" deactivated successfully',
                'approval_rule': {
                    'id': str(approval_rule.id),
                    'name': approval_rule.name,
                    'is_active': approval_rule.is_active
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to delete approval rule: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ApprovalRuleBulkOperationsView(APIView):
    """
    POST /api/approval-rules/bulk/
    
    Bulk operations for approval rules:
    - Bulk create/update multiple rules
    - Bulk reorder priorities
    - Bulk activate/deactivate
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        """
        Perform bulk operations on approval rules
        
        Supported operations:
        - bulk_create: Create multiple rules
        - bulk_update: Update multiple rules
        - reorder_priorities: Update rule priorities
        - bulk_toggle_status: Activate/deactivate multiple rules
        """
        try:
            user = request.user
            
            if user.role != 'admin':
                return Response({
                    'error': 'Only administrators can perform bulk operations'
                }, status=status.HTTP_403_FORBIDDEN)

            data = request.data
            operation = data.get('operation')

            if not operation:
                return Response({
                    'error': 'Missing required field: operation'
                }, status=status.HTTP_400_BAD_REQUEST)

            if operation == 'reorder_priorities':
                # Reorder rule priorities
                rule_priorities = data.get('rule_priorities', [])
                
                if not isinstance(rule_priorities, list):
                    return Response({
                        'error': 'rule_priorities must be a list'
                    }, status=status.HTTP_400_BAD_REQUEST)

                updated_rules = []
                for item in rule_priorities:
                    try:
                        rule_id = uuid.UUID(item['rule_id'])
                        priority = int(item['priority'])
                        
                        rule = ApprovalRule.objects.get(id=rule_id, company=user.company)
                        rule.priority = priority
                        rule.save()
                        
                        updated_rules.append({
                            'id': str(rule.id),
                            'name': rule.name,
                            'priority': rule.priority
                        })
                        
                    except (ValueError, KeyError, ApprovalRule.DoesNotExist):
                        continue

                return Response({
                    'message': f'Updated priorities for {len(updated_rules)} approval rules',
                    'updated_rules': updated_rules
                }, status=status.HTTP_200_OK)

            elif operation == 'bulk_toggle_status':
                # Bulk activate/deactivate rules
                rule_ids = data.get('rule_ids', [])
                is_active = data.get('is_active', True)
                
                if not isinstance(rule_ids, list):
                    return Response({
                        'error': 'rule_ids must be a list'
                    }, status=status.HTTP_400_BAD_REQUEST)

                updated_count = 0
                for rule_id in rule_ids:
                    try:
                        rule = ApprovalRule.objects.get(id=uuid.UUID(rule_id), company=user.company)
                        rule.is_active = is_active
                        rule.save()
                        updated_count += 1
                    except (ValueError, ApprovalRule.DoesNotExist):
                        continue

                action = 'activated' if is_active else 'deactivated'
                return Response({
                    'message': f'{action.title()} {updated_count} approval rules',
                    'updated_count': updated_count,
                    'action': action
                }, status=status.HTTP_200_OK)

            else:
                return Response({
                    'error': f'Unsupported operation: {operation}'
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'error': f'Failed to perform bulk operation: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ApprovalRuleValidationView(APIView):
    """
    POST /api/approval-rules/validate/
    
    Validate approval rule configuration before creating/updating
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Validate approval rule configuration"""
        try:
            user = request.user
            
            if user.role not in ['admin', 'manager']:
                return Response({
                    'error': 'Insufficient permissions to validate approval rules'
                }, status=status.HTTP_403_FORBIDDEN)

            data = request.data
            validation_results = {
                'is_valid': True,
                'errors': [],
                'warnings': [],
                'suggestions': []
            }

            # Validate rule name uniqueness
            rule_name = data.get('name')
            if rule_name:
                existing_rule = ApprovalRule.objects.filter(
                    name=rule_name, 
                    company=user.company,
                    is_active=True
                ).exclude(id=data.get('id')) if data.get('id') else ApprovalRule.objects.filter(
                    name=rule_name,
                    company=user.company,
                    is_active=True
                )
                
                if existing_rule.exists():
                    validation_results['errors'].append(f'Rule name "{rule_name}" already exists')
                    validation_results['is_valid'] = False

            # Validate amount range overlaps
            min_amount = data.get('amount_range', {}).get('min_amount')
            max_amount = data.get('amount_range', {}).get('max_amount')
            
            if min_amount is not None and max_amount is not None:
                try:
                    min_amt = Decimal(str(min_amount))
                    max_amt = Decimal(str(max_amount))
                    
                    # Check for overlapping rules
                    overlapping_rules = ApprovalRule.objects.filter(
                        company=user.company,
                        is_active=True
                    ).exclude(id=data.get('id')) if data.get('id') else ApprovalRule.objects.filter(
                        company=user.company,
                        is_active=True
                    )
                    
                    for rule in overlapping_rules:
                        if rule.min_amount and rule.max_amount:
                            if (min_amt <= rule.max_amount and max_amt >= rule.min_amount):
                                validation_results['warnings'].append(
                                    f'Amount range overlaps with rule "{rule.name}" '
                                    f'(${rule.min_amount} - ${rule.max_amount})'
                                )
                
                except (ValueError, TypeError):
                    validation_results['errors'].append('Invalid amount range format')
                    validation_results['is_valid'] = False

            # Validate approver configuration
            approval_config = data.get('approval_config', {})
            approvers = approval_config.get('approvers', [])
            
            if not approvers:
                validation_results['warnings'].append('No approvers configured - rule may not function as expected')
            else:
                # Check for duplicate approvers
                seen_approvers = set()
                for approver in approvers:
                    approver_key = (approver.get('role'), approver.get('user_id'))
                    if approver_key in seen_approvers:
                        validation_results['warnings'].append('Duplicate approvers detected')
                        break
                    seen_approvers.add(approver_key)

            # Performance suggestions
            if len(approvers) > 10:
                validation_results['suggestions'].append(
                    'Consider reducing the number of approvers for better performance'
                )

            percentage_required = approval_config.get('min_percentage_required', 100)
            if percentage_required < 50 and len(approvers) > 5:
                validation_results['suggestions'].append(
                    'Low percentage requirement with many approvers may lead to quick approvals'
                )

            return Response(validation_results, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                'error': f'Failed to validate approval rule: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)