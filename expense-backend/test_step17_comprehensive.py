#!/usr/bin/env python3
"""
Step 17: Comprehensive Testing & Local Run
=========================================

Complete test suite for all expense management system endpoints using Django's TestCase.
Covers authentication, user management, expense workflows, approval flows, 
currency conversion, and OCR functionality with offline mock support.

Test Coverage:
- Authentication (signup, login, logout)
- User Management (add, edit, permissions)
- Expense Management (create, update, submit, delete)
- Approval Workflows (sequential, percentage, specific, hybrid)
- Currency Conversion (with offline mocks)
- Receipt Upload & OCR (with offline mocks)
- Security & Permissions
- Integration endpoints

Author: GitHub Copilot
Date: October 4, 2025
"""

import os
import sys
import json
import uuid
import tempfile
from decimal import Decimal
from datetime import date, datetime, timedelta
from unittest.mock import patch, MagicMock
from io import BytesIO

import django
from django.test import TestCase, TransactionTestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from rest_framework.test import APITestCase, APIClient
from rest_framework.authtoken.models import Token
from rest_framework import status

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_management.settings')
django.setup()

# Import models and functions
from expenses.models import (
    User, Company, Expense, ApprovalRule, Approval
)


class BaseTestCase(APITestCase):
    """Base test case with common setup and utilities"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test company
        self.company = Company.objects.create(
            name="Test Corp",
            default_currency="USD"
        )
        
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="testpass123",
            name="Admin User",
            role="admin",
            company=self.company
        )
        
        self.manager_user = User.objects.create_user(
            email="manager@test.com",
            password="testpass123",
            name="Manager User",
            role="manager",
            company=self.company,
            manager=self.admin_user
        )
        
        self.employee_user = User.objects.create_user(
            email="employee@test.com",
            password="testpass123",
            name="Employee User",
            role="employee",
            company=self.company,
            manager=self.manager_user
        )
        
        # Create auth tokens
        self.admin_token = Token.objects.create(user=self.admin_user)
        self.manager_token = Token.objects.create(user=self.manager_user)
        self.employee_token = Token.objects.create(user=self.employee_user)
        
        # Create approval rule
        self.approval_rule = ApprovalRule.objects.create(
            name="Standard Approval",
            description="Standard approval flow",
            company=self.company,
            min_amount=Decimal('0.00'),
            max_amount=Decimal('1000.00'),
            approvers=[{"role": "manager", "order": 1}],
            min_percentage_required=100,
            created_by=self.admin_user
        )
    
    def authenticate(self, user_token):
        """Authenticate client with user token"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {user_token.key}')
    
    def create_test_expense(self, owner=None, amount="100.00"):
        """Create a test expense"""
        if owner is None:
            owner = self.employee_user
            
        return Expense.objects.create(
            owner=owner,
            amount=Decimal(amount),
            currency="USD",
            description="Test expense",
            category="Office Supplies",
            date=date.today(),
            company=self.company,
            approval_rule=self.approval_rule
        )


class AuthenticationTestCase(BaseTestCase):
    """Test authentication endpoints"""
    
    def test_user_signup(self):
        """Test user registration/signup"""
        signup_data = {
            "email": "newuser@test.com",
            "password": "newpass123",
            "name": "New User",
            "first_name": "New",
            "last_name": "User",
            "company_id": str(self.company.id)
        }
        
        response = self.client.post('/api/register/', signup_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('token', response.data)
        
        # Verify user was created
        new_user = User.objects.get(email="newuser@test.com")
        self.assertEqual(new_user.name, "New User")
        self.assertEqual(new_user.company, self.company)
    
    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": "employee@test.com",
            "password": "testpass123"
        }
        
        response = self.client.post('/api/login/', login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], "employee@test.com")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        login_data = {
            "email": "employee@test.com",
            "password": "wrongpassword"
        }
        
        response = self.client.post('/api/login/', login_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_logout(self):
        """Test user logout"""
        self.authenticate(self.employee_token)
        
        response = self.client.post('/api/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Token should be deleted
        self.assertFalse(Token.objects.filter(key=self.employee_token.key).exists())


class UserManagementTestCase(BaseTestCase):
    """Test user management endpoints"""
    
    def test_admin_can_list_users(self):
        """Test admin can list all users"""
        self.authenticate(self.admin_token)
        
        response = self.client.get('/api/secure/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('users', response.data['data'])
        self.assertEqual(len(response.data['data']['users']), 3)
    
    def test_employee_cannot_list_users(self):
        """Test employee cannot list users"""
        self.authenticate(self.employee_token)
        
        response = self.client.get('/api/secure/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_create_user(self):
        """Test admin can create new user"""
        self.authenticate(self.admin_token)
        
        user_data = {
            "email": "testuser@test.com",
            "password": "testpass123",
            "name": "Test User",
            "first_name": "Test",
            "last_name": "User",
            "role": "employee",
            "company_id": str(self.company.id)
        }
        
        response = self.client.post('/api/secure/users/', user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data['data'])
        
        # Verify user was created
        new_user = User.objects.get(email="testuser@test.com")
        self.assertEqual(new_user.role, "employee")
    
    def test_employee_cannot_create_user(self):
        """Test employee cannot create users"""
        self.authenticate(self.employee_token)
        
        user_data = {
            "email": "testuser@test.com",
            "password": "testpass123",
            "name": "Test User",
            "role": "employee",
            "company_id": str(self.company.id)
        }
        
        response = self.client.post('/api/secure/users/', user_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_get_current_user_profile(self):
        """Test getting current user profile"""
        self.authenticate(self.employee_token)
        
        response = self.client.get('/api/secure/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['profile']['email'], "employee@test.com")


class ExpenseManagementTestCase(BaseTestCase):
    """Test expense management endpoints"""
    
    def test_employee_can_create_expense(self):
        """Test employee can create expense"""
        self.authenticate(self.employee_token)
        
        expense_data = {
            "amount": "150.00",
            "currency": "USD",
            "description": "Business lunch",
            "category": "Meals",
            "date": date.today().isoformat()
        }
        
        response = self.client.post('/api/secure/expenses/', expense_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('expense', response.data['data'])
        
        # Verify expense was created
        expense = Expense.objects.get(id=response.data['data']['expense']['id'])
        self.assertEqual(expense.owner, self.employee_user)
        self.assertEqual(expense.amount, Decimal('150.00'))
    
    def test_employee_can_view_own_expense(self):
        """Test employee can view their own expense"""
        expense = self.create_test_expense(owner=self.employee_user)
        self.authenticate(self.employee_token)
        
        response = self.client.get(f'/api/secure/expenses/{expense.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['expense']['id'], str(expense.id))
    
    def test_employee_cannot_view_others_expense(self):
        """Test employee cannot view other's expense"""
        expense = self.create_test_expense(owner=self.manager_user)
        self.authenticate(self.employee_token)
        
        response = self.client.get(f'/api/secure/expenses/{expense.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_view_all_expenses(self):
        """Test admin can view all expenses"""
        expense = self.create_test_expense(owner=self.employee_user)
        self.authenticate(self.admin_token)
        
        response = self.client.get(f'/api/secure/expenses/{expense.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['expense']['id'], str(expense.id))
    
    def test_employee_can_update_own_expense(self):
        """Test employee can update their own expense"""
        expense = self.create_test_expense(owner=self.employee_user)
        self.authenticate(self.employee_token)
        
        update_data = {
            "description": "Updated description"
        }
        
        response = self.client.put(f'/api/secure/expenses/{expense.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify update
        expense.refresh_from_db()
        self.assertEqual(expense.description, "Updated description")
    
    def test_submit_expense_workflow(self):
        """Test expense submission workflow"""
        expense = self.create_test_expense(owner=self.employee_user)
        self.authenticate(self.employee_token)
        
        response = self.client.post(f'/api/secure/expenses/{expense.id}/submit/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify expense status changed
        expense.refresh_from_db()
        self.assertEqual(expense.status, 'pending')


class ApprovalWorkflowTestCase(BaseTestCase):
    """Test approval workflow functionality"""
    
    def setUp(self):
        super().setUp()
        
        # Create additional approval rules for different test scenarios
        
        # Sequential approval rule
        self.sequential_rule = ApprovalRule.objects.create(
            name="Sequential Approval",
            description="Manager then Admin approval",
            company=self.company,
            min_amount=Decimal('100.00'),
            max_amount=Decimal('500.00'),
            approvers=[
                {"role": "manager", "order": 1},
                {"role": "admin", "order": 2}
            ],
            min_percentage_required=100,
            created_by=self.admin_user
        )
        
        # Percentage-based approval rule
        self.percentage_rule = ApprovalRule.objects.create(
            name="Percentage Approval",
            description="50% of managers approval",
            company=self.company,
            min_amount=Decimal('500.00'),
            max_amount=Decimal('2000.00'),
            approvers=[{"role": "manager", "order": 1}],
            min_percentage_required=50,
            created_by=self.admin_user
        )
        
        # Specific approver rule
        self.specific_rule = ApprovalRule.objects.create(
            name="Specific Approver",
            description="Specific admin approval",
            company=self.company,
            min_amount=Decimal('2000.00'),
            max_amount=Decimal('10000.00'),
            approvers=[],
            specific_approver=self.admin_user,
            created_by=self.admin_user
        )
        
        # Hybrid rule (specific + percentage)
        self.hybrid_rule = ApprovalRule.objects.create(
            name="Hybrid Approval",
            description="Specific approver + percentage",
            company=self.company,
            min_amount=Decimal('5000.00'),
            max_amount=Decimal('20000.00'),
            approvers=[{"role": "manager", "order": 1}],
            specific_approver=self.admin_user,
            min_percentage_required=100,
            is_hybrid_rule=True,
            created_by=self.admin_user
        )
    
    def test_sequential_approval_flow(self):
        """Test sequential approval workflow"""
        # Create expense requiring sequential approval
        expense = Expense.objects.create(
            owner=self.employee_user,
            amount=Decimal('300.00'),
            currency="USD",
            description="Sequential approval test",
            category="Travel",
            date=date.today(),
            company=self.company,
            approval_rule=self.sequential_rule,
            status='pending'
        )
        
        # Manager approves first
        self.authenticate(self.manager_token)
        approval_data = {"comment": "Manager approval"}
        
        response = self.client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that approval was created
        approvals = Approval.objects.filter(expense=expense)
        self.assertEqual(approvals.count(), 1)
        self.assertEqual(approvals.first().approver, self.manager_user)
        
        # Admin approves second
        self.authenticate(self.admin_token)
        response = self.client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Expense should be approved
        expense.refresh_from_db()
        self.assertEqual(expense.status, 'approved')
    
    def test_percentage_approval_flow(self):
        """Test percentage-based approval workflow"""
        # Create expense requiring percentage approval
        expense = Expense.objects.create(
            owner=self.employee_user,
            amount=Decimal('1000.00'),
            currency="USD",
            description="Percentage approval test",
            category="Equipment",
            date=date.today(),
            company=self.company,
            approval_rule=self.percentage_rule,
            status='pending'
        )
        
        # Manager approves (should be enough for 50% requirement with 1 manager)
        self.authenticate(self.manager_token)
        approval_data = {"comment": "Manager approval"}
        
        response = self.client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Expense should be approved (50% threshold met)
        expense.refresh_from_db()
        self.assertEqual(expense.status, 'approved')
    
    def test_specific_approver_flow(self):
        """Test specific approver workflow"""
        # Create expense requiring specific approver
        expense = Expense.objects.create(
            owner=self.employee_user,
            amount=Decimal('3000.00'),
            currency="USD",
            description="Specific approver test",
            category="Equipment",
            date=date.today(),
            company=self.company,
            approval_rule=self.specific_rule,
            status='pending'
        )
        
        # Manager cannot approve (not the specific approver)
        self.authenticate(self.manager_token)
        approval_data = {"comment": "Manager attempt"}
        
        response = self.client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin can approve (is the specific approver)
        self.authenticate(self.admin_token)
        response = self.client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Expense should be approved
        expense.refresh_from_db()
        self.assertEqual(expense.status, 'approved')
    
    def test_hybrid_approval_flow(self):
        """Test hybrid approval workflow (specific + percentage)"""
        # Create expense requiring hybrid approval
        expense = Expense.objects.create(
            owner=self.employee_user,
            amount=Decimal('8000.00'),
            currency="USD",
            description="Hybrid approval test",
            category="Equipment",
            date=date.today(),
            company=self.company,
            approval_rule=self.hybrid_rule,
            status='pending'
        )
        
        # Manager approves first
        self.authenticate(self.manager_token)
        approval_data = {"comment": "Manager approval"}
        
        response = self.client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should still be pending (need specific approver too)
        expense.refresh_from_db()
        self.assertEqual(expense.status, 'pending')
        
        # Specific approver (admin) also approves
        self.authenticate(self.admin_token)
        response = self.client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Now should be approved
        expense.refresh_from_db()
        self.assertEqual(expense.status, 'approved')
    
    def test_expense_rejection_flow(self):
        """Test expense rejection workflow"""
        expense = self.create_test_expense()
        expense.status = 'pending'
        expense.save()
        
        self.authenticate(self.manager_token)
        
        rejection_data = {
            "comment": "Not a valid business expense"
        }
        
        response = self.client.post(f'/api/secure/expenses/{expense.id}/reject/', rejection_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Expense should be rejected
        expense.refresh_from_db()
        self.assertEqual(expense.status, 'rejected')
        
        # Check rejection was recorded
        approval = Approval.objects.get(expense=expense)
        self.assertEqual(approval.status, 'rejected')
        self.assertEqual(approval.comment, "Not a valid business expense")


class CurrencyConversionTestCase(BaseTestCase):
    """Test currency conversion functionality with offline mocks"""
    
    @patch('expenses.currency_service.requests.get')
    def test_get_exchange_rate_offline(self, mock_get):
        """Test currency exchange rate with mocked API"""
        # Mock the exchange rate API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "rates": {
                "EUR": 0.85,
                "GBP": 0.73,
                "JPY": 110.0
            },
            "base": "USD",
            "date": "2025-10-04"
        }
        mock_get.return_value = mock_response
        
        self.authenticate(self.admin_token)
        
        # Test exchange rate endpoint
        response = self.client.get('/api/currencies/exchange-rate/?from=USD&to=EUR&amount=100')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(data['from_currency'], 'USD')
        self.assertEqual(data['to_currency'], 'EUR')
        self.assertEqual(float(data['original_amount']), 100.0)
        
        # Verify mock was called
        mock_get.assert_called()
    
    @patch('expenses.currency_service.requests.get')
    def test_currency_conversion_offline(self, mock_get):
        """Test currency conversion with mocked API"""
        # Mock the conversion API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "rates": {"EUR": 0.85},
            "base": "USD"
        }
        mock_get.return_value = mock_response
        
        self.authenticate(self.admin_token)
        
        conversion_data = {
            "amount": "100.00",
            "from_currency": "USD",
            "to_currency": "EUR"
        }
        
        response = self.client.post('/api/currencies/convert/', conversion_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertEqual(data['from_currency'], 'USD')
        self.assertEqual(data['to_currency'], 'EUR')
        
    def test_get_countries_and_currencies(self):
        """Test getting countries and currencies list"""
        self.authenticate(self.admin_token)
        
        response = self.client.get('/api/currencies/countries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertIn('countries', data)
        self.assertIsInstance(data['countries'], list)
        self.assertTrue(len(data['countries']) > 0)


class OCRTestCase(BaseTestCase):
    """Test OCR functionality with offline mocks"""
    
    def create_test_image(self):
        """Create a test image file"""
        from PIL import Image
        
        # Create a simple test image
        image = Image.new('RGB', (100, 100), color='white')
        image_file = BytesIO()
        image.save(image_file, format='PNG')
        image_file.seek(0)
        
        return SimpleUploadedFile(
            "test_receipt.png",
            image_file.getvalue(),
            content_type="image/png"
        )
    
    @patch('expenses.ocr_api.extract_text_from_image')
    def test_receipt_text_extraction_offline(self, mock_extract):
        """Test OCR text extraction with mocked function"""
        # Mock OCR response
        mock_extract.return_value = {
            "success": True,
            "extracted_text": "RECEIPT\nStore Name: Test Store\nDate: 2025-10-04\nAmount: $25.99\nCategory: Food",
            "confidence": 0.95,
            "provider": "mock"
        }
        
        self.authenticate(self.employee_token)
        
        # Create test image
        test_image = self.create_test_image()
        
        response = self.client.post(
            '/api/ocr/extract-text/',
            {'image': test_image},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertTrue(data['success'])
        self.assertIn('extracted_text', data)
        self.assertIn('Test Store', data['extracted_text'])
        
        # Verify mock was called
        mock_extract.assert_called_once()
    
    @patch('expenses.ocr_api.extract_expense_data_from_image')
    def test_receipt_expense_extraction_offline(self, mock_extract_expense):
        """Test OCR expense data extraction with mocked function"""
        # Mock expense extraction response
        mock_extract_expense.return_value = {
            "success": True,
            "expense_data": {
                "amount": "25.99",
                "currency": "USD",
                "description": "Test Store purchase",
                "category": "Food & Dining",
                "date": "2025-10-04",
                "vendor": "Test Store"
            },
            "confidence": 0.90,
            "provider": "mock"
        }
        
        self.authenticate(self.employee_token)
        
        # Create test image
        test_image = self.create_test_image()
        
        response = self.client.post(
            '/api/ocr/extract-expense/',
            {'image': test_image},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertTrue(data['success'])
        self.assertIn('expense_data', data)
        
        expense_data = data['expense_data']
        self.assertEqual(expense_data['amount'], "25.99")
        self.assertEqual(expense_data['currency'], "USD")
        self.assertEqual(expense_data['category'], "Food & Dining")
        
        # Verify mock was called
        mock_extract_expense.assert_called_once()
    
    def test_get_ocr_providers(self):
        """Test getting available OCR providers"""
        self.authenticate(self.admin_token)
        
        response = self.client.get('/api/ocr/providers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertIn('providers', data)
        self.assertIsInstance(data['providers'], list)


class SecurityTestCase(BaseTestCase):
    """Test security and permissions"""
    
    def test_unauthenticated_access_blocked(self):
        """Test that unauthenticated requests are blocked"""
        # Clear any authentication
        self.client.credentials()
        response = self.client.get('/api/secure/users/')
        # Django may return 401 or 403 depending on the authentication/permission setup
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_invalid_token_blocked(self):
        """Test that invalid tokens are blocked"""
        self.client.credentials(HTTP_AUTHORIZATION='Token invalid-token-123')
        
        response = self.client.get('/api/secure/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_sql_injection_protection(self):
        """Test SQL injection protection"""
        self.authenticate(self.admin_token)
        
        # Try SQL injection in search parameter
        malicious_query = "'; DROP TABLE expenses_user; --"
        
        response = self.client.get(f'/api/secure/users/?search={malicious_query}')
        
        # Should not cause a server error (500)
        self.assertNotEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Users table should still exist
        self.assertTrue(User.objects.exists())
    
    def test_cross_company_access_blocked(self):
        """Test that users cannot access other companies' data"""
        # Create another company and user
        other_company = Company.objects.create(name="Other Corp", default_currency="EUR")
        other_user = User.objects.create_user(
            email="other@test.com",
            password="testpass123",
            name="Other User",
            role="employee",
            company=other_company
        )
        other_token = Token.objects.create(user=other_user)
        
        # Create expense in first company
        expense = self.create_test_expense()
        
        # Try to access with user from other company
        self.authenticate(other_token)
        response = self.client.get(f'/api/secure/expenses/{expense.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class IntegrationTestCase(BaseTestCase):
    """Test integration endpoints and service status"""
    
    def test_service_status_endpoint(self):
        """Test service status endpoint"""
        self.authenticate(self.admin_token)
        
        response = self.client.get('/api/integrations/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertIn('services', data)
        
        services = data['services']
        self.assertIn('database', services)
        self.assertIn('currency_api', services)
        self.assertIn('ocr_service', services)
    
    @patch('expenses.currency_service.requests.get')
    def test_clear_currency_cache(self, mock_get):
        """Test clearing currency cache"""
        self.authenticate(self.admin_token)
        
        response = self.client.post('/api/currencies/cache/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data['data']
        self.assertIn('cache_cleared', data)
        self.assertTrue(data['cache_cleared'])


class OfflineRunTestCase(BaseTestCase):
    """Test that the system can run completely offline"""
    
    @patch('expenses.currency_service.requests.get')
    @patch('expenses.ocr_api.extract_text_from_image')
    @patch('expenses.ocr_api.extract_expense_data_from_image')
    def test_complete_offline_workflow(self, mock_ocr_expense, mock_ocr_text, mock_currency):
        """Test complete workflow in offline mode with all external APIs mocked"""
        
        # Mock currency API
        mock_currency_response = MagicMock()
        mock_currency_response.status_code = 200
        mock_currency_response.json.return_value = {
            "rates": {"EUR": 0.85},
            "base": "USD"
        }
        mock_currency.return_value = mock_currency_response
        
        # Mock OCR APIs
        mock_ocr_text.return_value = {
            "success": True,
            "extracted_text": "RECEIPT\nAmount: $150.00",
            "confidence": 0.95,
            "provider": "mock"
        }
        
        mock_ocr_expense.return_value = {
            "success": True,
            "expense_data": {
                "amount": "150.00",
                "currency": "USD",
                "description": "Business lunch",
                "category": "Meals",
                "date": "2025-10-04"
            },
            "confidence": 0.90,
            "provider": "mock"
        }
        
        # 1. Employee creates expense
        self.authenticate(self.employee_token)
        
        expense_data = {
            "amount": "150.00",
            "currency": "USD",
            "description": "Business lunch",
            "category": "Meals",
            "date": date.today().isoformat()
        }
        
        response = self.client.post('/api/secure/expenses/', expense_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        expense_id = response.data['data']['expense']['id']
        
        # 2. Employee submits expense
        response = self.client.post(f'/api/secure/expenses/{expense_id}/submit/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Manager approves expense
        self.authenticate(self.manager_token)
        
        approval_data = {"comment": "Approved"}
        response = self.client.post(f'/api/secure/expenses/{expense_id}/approve/', approval_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Test currency conversion
        conversion_data = {
            "amount": "150.00",
            "from_currency": "USD",
            "to_currency": "EUR"
        }
        
        response = self.client.post('/api/currencies/convert/', conversion_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Test OCR functionality
        test_image = self.create_test_image()
        
        response = self.client.post(
            '/api/ocr/extract-text/',
            {'image': test_image},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 6. Verify expense is approved
        expense = Expense.objects.get(id=expense_id)
        self.assertEqual(expense.status, 'approved')
        
        print("\n✅ Complete offline workflow test passed!")
        print("   - Expense creation: ✅")
        print("   - Expense submission: ✅") 
        print("   - Manager approval: ✅")
        print("   - Currency conversion: ✅")
        print("   - OCR processing: ✅")
        print("   - All external APIs mocked: ✅")


def run_comprehensive_tests():
    """Run all comprehensive tests"""
    import unittest
    
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add all test cases
    test_classes = [
        AuthenticationTestCase,
        UserManagementTestCase,
        ExpenseManagementTestCase,
        ApprovalWorkflowTestCase,
        CurrencyConversionTestCase,
        OCRTestCase,
        SecurityTestCase,
        IntegrationTestCase,
        OfflineRunTestCase
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print(f"\n" + "="*80)
    print("STEP 17: COMPREHENSIVE TESTING SUMMARY")
    print("="*80)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\nFailures ({len(result.failures)}):")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback}")
    
    if result.errors:
        print(f"\nErrors ({len(result.errors)}):")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback}")
    
    if not result.failures and not result.errors:
        print("\n🎉 ALL TESTS PASSED! System is ready for production.")
    
    print("="*80)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_comprehensive_tests()
    sys.exit(0 if success else 1)