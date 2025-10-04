#!/usr/bin/env python3
"""
Step 17: Pytest Configuration and Additional Tests
==================================================

Pytest-based test configuration with fixtures and additional test coverage.
Provides enhanced testing capabilities and better test organization.

Author: GitHub Copilot
Date: October 4, 2025
"""

import os
import sys
import pytest
import tempfile
from decimal import Decimal
from datetime import date, datetime
from unittest.mock import patch, MagicMock
from io import BytesIO

import django
from django.test import override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from rest_framework import status

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_management.settings')
django.setup()

from expenses.models import User, Company, Expense, ApprovalRule, Approval


# Pytest Configuration
pytest_plugins = ['django.test.plugin']


# Fixtures
@pytest.fixture
def api_client():
    """API client fixture"""
    return APIClient()


@pytest.fixture
def test_company():
    """Test company fixture"""
    return Company.objects.create(
        name="Test Corp",
        default_currency="USD"
    )


@pytest.fixture
def admin_user(test_company):
    """Admin user fixture"""
    user = User.objects.create_user(
        email="admin@test.com",
        name="Admin User",
        password="testpass123",
        role="admin",
        company=test_company
    )
    return user


@pytest.fixture
def manager_user(test_company, admin_user):
    """Manager user fixture"""
    user = User.objects.create_user(
        email="manager@test.com",
        name="Manager User", 
        password="testpass123",
        role="manager",
        company=test_company,
        manager=admin_user
    )
    return user


@pytest.fixture
def employee_user(test_company, manager_user):
    """Employee user fixture"""
    user = User.objects.create_user(
        email="employee@test.com",
        name="Employee User",
        password="testpass123", 
        role="employee",
        company=test_company,
        manager=manager_user
    )
    return user


@pytest.fixture
def auth_tokens(admin_user, manager_user, employee_user):
    """Authentication tokens fixture"""
    return {
        'admin': Token.objects.create(user=admin_user),
        'manager': Token.objects.create(user=manager_user),
        'employee': Token.objects.create(user=employee_user)
    }


@pytest.fixture
def approval_rule(test_company, admin_user):
    """Basic approval rule fixture"""
    return ApprovalRule.objects.create(
        name="Standard Approval",
        description="Standard approval flow",
        company=test_company,
        min_amount=Decimal('0.00'),
        max_amount=Decimal('1000.00'),
        approvers=[{"role": "manager", "order": 1}],
        min_percentage_required=100,
        created_by=admin_user
    )


@pytest.fixture
def test_expense(employee_user, test_company, approval_rule):
    """Test expense fixture"""
    return Expense.objects.create(
        owner=employee_user,
        amount=Decimal('100.00'),
        currency="USD",
        description="Test expense",
        category="Office Supplies",
        date=date.today(),
        company=test_company,
        approval_rule=approval_rule
    )


# Authentication Tests
@pytest.mark.django_db
def test_user_signup_success(api_client, test_company):
    """Test successful user registration"""
    signup_data = {
        "email": "newuser@test.com",
        "password": "newpass123",
        "name": "New User",
        "first_name": "New",
        "last_name": "User",
        "company_id": str(test_company.id)
    }
    
    response = api_client.post('/api/register/', signup_data)
    assert response.status_code == status.HTTP_201_CREATED
    assert 'user' in response.data
    assert 'token' in response.data
    
    # Verify user was created
    user = User.objects.get(email="newuser@test.com")
    assert user.name == "New User"
    assert user.company == test_company


@pytest.mark.django_db
def test_user_login_success(api_client, employee_user):
    """Test successful user login"""
    login_data = {
        "email": "employee@test.com",
        "password": "testpass123"
    }
    
    response = api_client.post('/api/login/', login_data)
    assert response.status_code == status.HTTP_200_OK
    assert 'token' in response.data
    assert 'user' in response.data
    assert response.data['user']['email'] == "employee@test.com"


@pytest.mark.django_db
def test_invalid_login(api_client, employee_user):
    """Test login with invalid credentials"""
    login_data = {
        "email": "employee@test.com",
        "password": "wrongpassword"
    }
    
    response = api_client.post('/api/login/', login_data)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'error' in response.data


# User Management Tests
@pytest.mark.django_db
def test_admin_can_list_users(api_client, auth_tokens):
    """Test admin can list all users"""
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["admin"].key}')
    
    response = api_client.get('/api/secure/users/')
    assert response.status_code == status.HTTP_200_OK
    assert 'users' in response.data['data']


@pytest.mark.django_db
def test_employee_cannot_list_users(api_client, auth_tokens):
    """Test employee cannot list users"""
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["employee"].key}')
    
    response = api_client.get('/api/secure/users/')
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db 
def test_admin_can_create_user(api_client, auth_tokens, test_company):
    """Test admin can create new user"""
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["admin"].key}')
    
    user_data = {
        "email": "testuser@test.com",
        "password": "testpass123",
        "name": "Test User",
        "first_name": "Test",
        "last_name": "User",
        "role": "employee",
        "company_id": str(test_company.id)
    }
    
    response = api_client.post('/api/secure/users/', user_data)
    assert response.status_code == status.HTTP_201_CREATED
    assert 'user' in response.data['data']
    
    # Verify user was created
    new_user = User.objects.get(email="testuser@test.com")
    assert new_user.role == "employee"


# Expense Management Tests
@pytest.mark.django_db
def test_employee_can_create_expense(api_client, auth_tokens):
    """Test employee can create expense"""
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["employee"].key}')
    
    expense_data = {
        "amount": "150.00",
        "currency": "USD",
        "description": "Business lunch",
        "category": "Meals",
        "date": date.today().isoformat()
    }
    
    response = api_client.post('/api/secure/expenses/', expense_data)
    assert response.status_code == status.HTTP_201_CREATED
    assert 'expense' in response.data['data']
    
    # Verify expense was created
    expense = Expense.objects.get(id=response.data['data']['expense']['id'])
    assert expense.amount == Decimal('150.00')


@pytest.mark.django_db
def test_employee_can_view_own_expense(api_client, auth_tokens, test_expense):
    """Test employee can view their own expense"""
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["employee"].key}')
    
    response = api_client.get(f'/api/secure/expenses/{test_expense.id}/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['data']['expense']['id'] == str(test_expense.id)


@pytest.mark.django_db
def test_employee_cannot_view_others_expense(api_client, auth_tokens, manager_user, test_company, approval_rule):
    """Test employee cannot view other's expense"""
    # Create expense owned by manager
    manager_expense = Expense.objects.create(
        owner=manager_user,
        amount=Decimal('200.00'),
        currency="USD",
        description="Manager expense",
        category="Travel",
        date=date.today(),
        company=test_company,
        approval_rule=approval_rule
    )
    
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["employee"].key}')
    
    response = api_client.get(f'/api/secure/expenses/{manager_expense.id}/')
    assert response.status_code == status.HTTP_403_FORBIDDEN


# Approval Workflow Tests
@pytest.mark.django_db
def test_sequential_approval_flow(api_client, auth_tokens, test_company, admin_user, employee_user):
    """Test sequential approval workflow"""
    # Create sequential approval rule
    sequential_rule = ApprovalRule.objects.create(
        name="Sequential Approval",
        description="Manager then Admin approval",
        company=test_company,
        min_amount=Decimal('100.00'),
        max_amount=Decimal('500.00'),
        approvers=[
            {"role": "manager", "order": 1},
            {"role": "admin", "order": 2}
        ],
        min_percentage_required=100,
        created_by=admin_user
    )
    
    # Create expense requiring sequential approval
    expense = Expense.objects.create(
        owner=employee_user,
        amount=Decimal('300.00'),
        currency="USD",
        description="Sequential approval test",
        category="Travel",
        date=date.today(),
        company=test_company,
        approval_rule=sequential_rule,
        status='pending'
    )
    
    # Manager approves first
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["manager"].key}')
    approval_data = {"comment": "Manager approval"}
    
    response = api_client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
    assert response.status_code == status.HTTP_200_OK
    
    # Check that approval was created
    approvals = Approval.objects.filter(expense=expense)
    assert approvals.count() == 1
    
    # Admin approves second
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["admin"].key}')
    response = api_client.post(f'/api/secure/expenses/{expense.id}/approve/', approval_data)
    assert response.status_code == status.HTTP_200_OK
    
    # Expense should be approved
    expense.refresh_from_db()
    assert expense.status == 'approved'


@pytest.mark.django_db
def test_expense_rejection_flow(api_client, auth_tokens, test_expense):
    """Test expense rejection workflow"""
    test_expense.status = 'pending'
    test_expense.save()
    
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["manager"].key}')
    
    rejection_data = {
        "comment": "Not a valid business expense"
    }
    
    response = api_client.post(f'/api/secure/expenses/{test_expense.id}/reject/', rejection_data)
    assert response.status_code == status.HTTP_200_OK
    
    # Expense should be rejected
    test_expense.refresh_from_db()
    assert test_expense.status == 'rejected'
    
    # Check rejection was recorded
    approval = Approval.objects.get(expense=test_expense)
    assert approval.status == 'rejected'
    assert approval.comment == "Not a valid business expense"


# Currency Tests with Mocks
@pytest.mark.django_db
@patch('expenses.currency_ocr_api.requests.get')
def test_currency_conversion_offline(mock_get, api_client, auth_tokens):
    """Test currency conversion with mocked API"""
    # Mock the conversion API response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "rates": {"EUR": 0.85},
        "base": "USD"
    }
    mock_get.return_value = mock_response
    
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["admin"].key}')
    
    conversion_data = {
        "amount": "100.00",
        "from_currency": "USD", 
        "to_currency": "EUR"
    }
    
    response = api_client.post('/api/currencies/convert/', conversion_data)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.data['data']
    assert data['from_currency'] == 'USD'
    assert data['to_currency'] == 'EUR'


# OCR Tests with Mocks
@pytest.mark.django_db
@patch('expenses.ocr_api.extract_text_from_image')
def test_receipt_text_extraction_offline(mock_extract, api_client, auth_tokens):
    """Test OCR text extraction with mocked function"""
    # Mock OCR response
    mock_extract.return_value = {
        "success": True,
        "extracted_text": "RECEIPT\nStore Name: Test Store\nAmount: $25.99",
        "confidence": 0.95,
        "provider": "mock"
    }
    
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["employee"].key}')
    
    # Create test image
    from PIL import Image
    image = Image.new('RGB', (100, 100), color='white')
    image_file = BytesIO()
    image.save(image_file, format='PNG')
    image_file.seek(0)
    
    from django.core.files.uploadedfile import SimpleUploadedFile
    test_image = SimpleUploadedFile(
        "test_receipt.png",
        image_file.getvalue(),
        content_type="image/png"
    )
    
    response = api_client.post(
        '/api/ocr/extract-text/',
        {'image': test_image},
        format='multipart'
    )
    
    assert response.status_code == status.HTTP_200_OK
    
    data = response.data['data']
    assert data['success'] == True
    assert 'extracted_text' in data
    
    # Verify mock was called
    mock_extract.assert_called_once()


# Security Tests
@pytest.mark.django_db
def test_unauthenticated_access_blocked(api_client):
    """Test that unauthenticated requests are blocked"""
    response = api_client.get('/api/secure/users/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_invalid_token_blocked(api_client):
    """Test that invalid tokens are blocked"""
    api_client.credentials(HTTP_AUTHORIZATION='Token invalid-token-123')
    
    response = api_client.get('/api/secure/users/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_sql_injection_protection(api_client, auth_tokens):
    """Test SQL injection protection"""
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["admin"].key}')
    
    # Try SQL injection in search parameter
    malicious_query = "'; DROP TABLE expenses_user; --"
    
    response = api_client.get(f'/api/secure/users/?search={malicious_query}')
    
    # Should not cause a server error (500)
    assert response.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR
    
    # Users table should still exist
    assert User.objects.exists()


# Integration Tests
@pytest.mark.django_db
def test_service_status_endpoint(api_client, auth_tokens):
    """Test service status endpoint"""
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["admin"].key}')
    
    response = api_client.get('/api/integrations/status/')
    assert response.status_code == status.HTTP_200_OK
    
    data = response.data['data']
    assert 'services' in data
    
    services = data['services']
    assert 'database' in services
    assert 'currency_api' in services
    assert 'ocr_service' in services


# Offline Workflow Test
@pytest.mark.django_db
@patch('expenses.currency_ocr_api.requests.get')
@patch('expenses.ocr_api.extract_text_from_image')
@patch('expenses.ocr_api.extract_expense_data_from_image')
def test_complete_offline_workflow(mock_ocr_expense, mock_ocr_text, mock_currency, 
                                 api_client, auth_tokens, employee_user):
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
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["employee"].key}')
    
    expense_data = {
        "amount": "150.00",
        "currency": "USD",
        "description": "Business lunch",
        "category": "Meals",
        "date": date.today().isoformat()
    }
    
    response = api_client.post('/api/secure/expenses/', expense_data)
    assert response.status_code == status.HTTP_201_CREATED
    expense_id = response.data['data']['expense']['id']
    
    # 2. Employee submits expense
    response = api_client.post(f'/api/secure/expenses/{expense_id}/submit/')
    assert response.status_code == status.HTTP_200_OK
    
    # 3. Manager approves expense
    api_client.credentials(HTTP_AUTHORIZATION=f'Token {auth_tokens["manager"].key}')
    
    approval_data = {"comment": "Approved"}
    response = api_client.post(f'/api/secure/expenses/{expense_id}/approve/', approval_data)
    assert response.status_code == status.HTTP_200_OK
    
    # 4. Test currency conversion
    conversion_data = {
        "amount": "150.00",
        "from_currency": "USD",
        "to_currency": "EUR"
    }
    
    response = api_client.post('/api/currencies/convert/', conversion_data)
    assert response.status_code == status.HTTP_200_OK
    
    # 5. Verify expense is approved
    expense = Expense.objects.get(id=expense_id)
    assert expense.status == 'approved'


if __name__ == "__main__":
    # Run with pytest
    pytest.main([__file__, "-v"])