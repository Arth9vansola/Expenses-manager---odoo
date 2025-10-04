import os
import uuid
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from decimal import Decimal
from datetime import datetime
import json
import logging

from .models import Expense, User, Company, ApprovalRule
from .serializers import ExpenseSerializer
from .ocr_service import ocr_service

logger = logging.getLogger(__name__)


class ExpenseSubmissionSerializer(serializers.Serializer):
    """Serializer for expense submission with optional OCR processing."""
    
    owner_id = serializers.UUIDField(required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    currency = serializers.CharField(max_length=3, required=False)
    category = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    date = serializers.DateField(required=False)
    receipt = serializers.ImageField(required=False, allow_null=True)
    
    # OCR processing options
    auto_extract = serializers.BooleanField(default=True)
    override_ocr = serializers.BooleanField(default=False)
    
    def validate_owner_id(self, value):
        """Validate owner exists and belongs to same company as requester."""
        if value:
            try:
                user = User.objects.get(id=value)
                # Check if user belongs to same company as requester
                request = self.context.get('request')
                if request and request.user.company != user.company:
                    raise serializers.ValidationError("User not found in your company.")
                return value
            except User.DoesNotExist:
                raise serializers.ValidationError("User not found.")
        return value
    
    def validate_currency(self, value):
        """Validate currency code."""
        if value:
            valid_currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CNY']
            if value.upper() not in valid_currencies:
                raise serializers.ValidationError(f"Unsupported currency. Valid options: {', '.join(valid_currencies)}")
            return value.upper()
        return value
    
    def validate_category(self, value):
        """Validate expense category."""
        if value:
            valid_categories = ['Travel', 'Meals', 'Office Supplies', 'Transportation', 'Entertainment', 'Healthcare', 'Technology', 'Other']
            if value not in valid_categories:
                raise serializers.ValidationError(f"Invalid category. Valid options: {', '.join(valid_categories)}")
        return value


class ExpenseSubmissionView(APIView):
    """
    API endpoint for submitting expenses with OCR processing.
    Supports both form data and JSON payloads.
    """
    
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def post(self, request):
        """Submit a new expense with optional receipt OCR processing."""
        
        serializer = ExpenseSubmissionSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        try:
            with transaction.atomic():
                # Determine expense owner
                owner_id = validated_data.get('owner_id')
                if owner_id:
                    # Admin/Manager creating expense for another user
                    if request.user.role not in ['admin', 'manager']:
                        return Response({
                            'error': 'Permission denied. Only admins and managers can create expenses for others.'
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    expense_owner = User.objects.get(id=owner_id)
                else:
                    # User creating their own expense
                    expense_owner = request.user
                
                # Initialize expense data
                expense_data = {
                    'owner': expense_owner,
                    'company': expense_owner.company,
                    'status': 'draft',
                    'currency': validated_data.get('currency') or expense_owner.company.currency,
                    'created_by': request.user
                }
                
                # Handle receipt upload and OCR processing
                receipt_file = validated_data.get('receipt')
                ocr_results = None
                
                if receipt_file and validated_data.get('auto_extract', True):
                    try:
                        # Save receipt file temporarily for OCR processing
                        receipt_path = self._save_receipt_file(receipt_file)
                        
                        # Process receipt with OCR
                        ocr_results = ocr_service.process_receipt(receipt_path)
                        
                        # Extract OCR data if not overridden by user input
                        extracted_data = ocr_results.get('extracted_data', {})
                        
                        if not validated_data.get('override_ocr', False):
                            # Auto-fill fields from OCR if not provided by user
                            if not validated_data.get('amount') and extracted_data.get('amount'):
                                expense_data['amount'] = Decimal(str(extracted_data['amount']))
                            
                            if not validated_data.get('date') and extracted_data.get('date'):
                                try:
                                    expense_data['date'] = datetime.strptime(extracted_data['date'], '%Y-%m-%d').date()
                                except (ValueError, TypeError):
                                    expense_data['date'] = datetime.now().date()
                            
                            if not validated_data.get('category') and extracted_data.get('category'):
                                expense_data['category'] = extracted_data['category']
                            
                            if not validated_data.get('description') and extracted_data.get('merchant'):
                                expense_data['description'] = f"Expense at {extracted_data['merchant']}"
                            
                            if not validated_data.get('currency') and extracted_data.get('currency'):
                                expense_data['currency'] = extracted_data['currency']
                        
                    except Exception as e:
                        logger.error(f"OCR processing failed: {str(e)}")
                        # Continue without OCR data
                        pass
                
                # Override with user-provided data
                for field in ['amount', 'currency', 'category', 'description', 'date']:
                    if validated_data.get(field) is not None:
                        expense_data[field] = validated_data[field]
                
                # Set default values for required fields
                if 'amount' not in expense_data:
                    expense_data['amount'] = Decimal('0.00')
                if 'date' not in expense_data:
                    expense_data['date'] = datetime.now().date()
                if 'category' not in expense_data:
                    expense_data['category'] = 'Other'
                if 'description' not in expense_data:
                    expense_data['description'] = 'Expense submission'
                
                # Create expense record
                expense = Expense.objects.create(**expense_data)
                
                # Save receipt file permanently
                if receipt_file:
                    receipt_filename = f"receipts/{expense.id}_{uuid.uuid4().hex[:8]}.{receipt_file.name.split('.')[-1]}"
                    saved_path = default_storage.save(receipt_filename, receipt_file)
                    expense.receipt = saved_path
                    expense.save()
                
                # Link to approval rules
                self._link_approval_rules(expense)
                
                # Store OCR metadata
                if ocr_results:
                    expense.metadata = {
                        'ocr_processed': True,
                        'ocr_confidence': ocr_results.get('confidence', 0),
                        'ocr_method': ocr_results.get('processing_method', 'unknown'),
                        'extracted_fields': list(ocr_results.get('extracted_data', {}).keys()),
                        'original_text': ocr_results.get('ocr_text', '')[:500]  # Truncate for storage
                    }
                    expense.save()
                
                # Serialize response
                expense_serializer = ExpenseSerializer(expense)
                
                response_data = {
                    'message': 'Expense created successfully',
                    'expense': expense_serializer.data,
                }
                
                # Include OCR results in response if available
                if ocr_results:
                    response_data['ocr_results'] = {
                        'extracted_data': ocr_results.get('extracted_data', {}),
                        'confidence': ocr_results.get('confidence', 0),
                        'processing_method': ocr_results.get('processing_method', 'unknown')
                    }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Expense creation failed: {str(e)}")
            return Response({
                'error': 'Failed to create expense',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _save_receipt_file(self, receipt_file) -> str:
        """Save receipt file temporarily for OCR processing."""
        # Create temp directory if it doesn't exist
        temp_dir = 'temp_receipts'
        os.makedirs(temp_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = receipt_file.name.split('.')[-1] if '.' in receipt_file.name else 'jpg'
        filename = f"{uuid.uuid4().hex}.{file_extension}"
        filepath = os.path.join(temp_dir, filename)
        
        # Save file
        with open(filepath, 'wb') as f:
            for chunk in receipt_file.chunks():
                f.write(chunk)
        
        return filepath
    
    def _link_approval_rules(self, expense: Expense):
        """Link expense to applicable approval rules based on amount and category."""
        try:
            # Find applicable approval rules
            approval_rules = ApprovalRule.objects.filter(
                company=expense.company,
                is_active=True
            ).order_by('min_amount')
            
            # Find the rule that applies to this expense
            applicable_rule = None
            for rule in approval_rules:
                if (rule.min_amount is None or expense.amount >= rule.min_amount) and \
                   (rule.max_amount is None or expense.amount <= rule.max_amount):
                    # Check category match if specified
                    rule_categories = rule.conditions.get('categories', []) if rule.conditions else []
                    if not rule_categories or expense.category in rule_categories:
                        applicable_rule = rule
                        break
            
            # Store approval rule reference
            if applicable_rule:
                if not expense.metadata:
                    expense.metadata = {}
                expense.metadata['approval_rule_id'] = str(applicable_rule.id)
                expense.metadata['requires_approval'] = True
                expense.save()
            else:
                # No approval rule found - expense can be auto-approved
                if not expense.metadata:
                    expense.metadata = {}
                expense.metadata['requires_approval'] = False
                expense.save()
                
        except Exception as e:
            logger.error(f"Failed to link approval rules: {str(e)}")


class ExpenseListView(APIView):
    """
    API endpoint for viewing expense history with role-based access control.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get expenses based on user role and permissions."""
        
        user = request.user
        
        # Base queryset - company scoped
        queryset = Expense.objects.filter(company=user.company)
        
        # Apply role-based filtering
        if user.role == 'employee':
            # Employees can only see their own expenses
            queryset = queryset.filter(owner=user)
        elif user.role == 'manager':
            # Managers can see their own expenses and their subordinates'
            subordinate_ids = User.objects.filter(manager=user).values_list('id', flat=True)
            queryset = queryset.filter(
                owner__in=list(subordinate_ids) + [user.id]
            )
        elif user.role == 'admin':
            # Admins can see all company expenses
            pass  # No additional filtering needed
        
        # Apply query parameters for filtering
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        date_from = request.query_params.get('date_from')
        if date_from:
            try:
                queryset = queryset.filter(date__gte=datetime.strptime(date_from, '%Y-%m-%d').date())
            except ValueError:
                pass
        
        date_to = request.query_params.get('date_to')
        if date_to:
            try:
                queryset = queryset.filter(date__lte=datetime.strptime(date_to, '%Y-%m-%d').date())
            except ValueError:
                pass
        
        # Order by most recent first
        queryset = queryset.order_by('-created_at')
        
        # Paginate results
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        page = int(request.query_params.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = queryset.count()
        expenses = queryset[start:end]
        
        # Serialize results
        serializer = ExpenseSerializer(expenses, many=True)
        
        return Response({
            'expenses': serializer.data,
            'pagination': {
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size
            },
            'filters_applied': {
                'category': category,
                'status': status_filter,
                'date_from': date_from,
                'date_to': date_to
            }
        }, status=status.HTTP_200_OK)


class ExpenseDetailView(APIView):
    """
    API endpoint for viewing individual expense details with role-based access.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id=None):
        """Get expenses for a specific user (with permission checks)."""
        
        current_user = request.user
        
        # Determine target user
        if user_id:
            try:
                target_user = User.objects.get(id=user_id, company=current_user.company)
            except User.DoesNotExist:
                return Response({
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            target_user = current_user
        
        # Check permissions
        if not self._can_view_user_expenses(current_user, target_user):
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get expenses for target user
        queryset = Expense.objects.filter(
            owner=target_user,
            company=current_user.company
        ).order_by('-created_at')
        
        # Apply filters
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Serialize results
        serializer = ExpenseSerializer(queryset, many=True)
        
        return Response({
            'user': {
                'id': str(target_user.id),
                'name': target_user.name,
                'email': target_user.email,
                'role': target_user.role
            },
            'expenses': serializer.data,
            'total_count': queryset.count()
        }, status=status.HTTP_200_OK)
    
    def _can_view_user_expenses(self, current_user: User, target_user: User) -> bool:
        """Check if current user can view target user's expenses."""
        
        # Users can always view their own expenses
        if current_user.id == target_user.id:
            return True
        
        # Admins can view anyone's expenses in their company
        if current_user.role == 'admin':
            return True
        
        # Managers can view their subordinates' expenses
        if current_user.role == 'manager':
            return target_user.manager == current_user
        
        # Employees can only view their own expenses
        return False