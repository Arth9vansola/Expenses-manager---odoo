#!/usr/bin/env python3
"""
Expense Submission API Test Script

This script demonstrates the expense submission API with OCR processing:
- POST /api/expenses/submit/ - Submit expense with receipt OCR
- GET /api/expenses/list/ - List expenses with role-based access
- GET /api/expenses/{user_id}/ - Get user-specific expenses
- GET /api/expenses/my/ - Get current user's expenses
"""

import requests
import json
import io
from PIL import Image, ImageDraw, ImageFont
import os

BASE_URL = "http://127.0.0.1:8000/api"

def create_mock_receipt(filename: str = "mock_receipt.jpg") -> str:
    """Create a mock receipt image for testing OCR."""
    
    # Create a simple receipt image
    img = Image.new('RGB', (400, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        # Try to use a default font
        font_large = ImageFont.truetype("arial.ttf", 20)
        font_medium = ImageFont.truetype("arial.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except:
        # Fallback to default font
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Receipt content
    y_pos = 20
    
    # Header
    draw.text((100, y_pos), "GOURMET BISTRO", fill='black', font=font_large)
    y_pos += 40
    
    draw.text((120, y_pos), "123 Main Street", fill='black', font=font_small)
    y_pos += 25
    
    draw.text((110, y_pos), "New York, NY 10001", fill='black', font=font_small)
    y_pos += 40
    
    # Date and time
    draw.text((50, y_pos), "Date: 2025-10-04", fill='black', font=font_medium)
    y_pos += 25
    
    draw.text((50, y_pos), "Time: 12:30 PM", fill='black', font=font_medium)
    y_pos += 40
    
    # Order details
    draw.text((50, y_pos), "Table 5 - Server: John", fill='black', font=font_small)
    y_pos += 35
    
    # Line separator
    draw.line([(30, y_pos), (370, y_pos)], fill='black', width=1)
    y_pos += 20
    
    # Items
    items = [
        ("Caesar Salad", "$12.50"),
        ("Grilled Salmon", "$24.95"),
        ("Coffee", "$3.50"),
    ]
    
    for item, price in items:
        draw.text((50, y_pos), item, fill='black', font=font_medium)
        draw.text((300, y_pos), price, fill='black', font=font_medium)
        y_pos += 25
    
    # Line separator
    y_pos += 10
    draw.line([(30, y_pos), (370, y_pos)], fill='black', width=1)
    y_pos += 20
    
    # Totals
    totals = [
        ("Subtotal:", "$40.95"),
        ("Tax:", "$3.28"),
        ("Total:", "$44.23"),
    ]
    
    for label, amount in totals:
        font = font_large if "Total:" in label else font_medium
        draw.text((50, y_pos), label, fill='black', font=font)
        draw.text((300, y_pos), amount, fill='black', font=font)
        y_pos += 25 if "Total:" in label else 20
    
    # Footer
    y_pos += 20
    draw.text((80, y_pos), "Thank you for dining with us!", fill='black', font=font_small)
    
    # Save image
    img.save(filename)
    return filename

def login_user(email: str, password: str) -> str:
    """Login and return auth token."""
    login_data = {
        "email": email,
        "password": password
    }
    
    response = requests.post(f"{BASE_URL}/login/", json=login_data)
    if response.status_code == 200:
        return response.json()["token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def test_expense_submission_with_receipt(token: str):
    """Test expense submission with receipt OCR processing."""
    print("\n💰 Testing Expense Submission with Receipt OCR...")
    
    # Create mock receipt
    receipt_path = create_mock_receipt("test_receipt.jpg")
    
    # Prepare expense data
    expense_data = {
        'category': 'Meals',
        'description': 'Business lunch',
        'auto_extract': True,
        'override_ocr': False
    }
    
    # Prepare files
    files = {
        'receipt': ('test_receipt.jpg', open(receipt_path, 'rb'), 'image/jpeg')
    }
    
    headers = {"Authorization": f"Token {token}"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/expenses/submit/", 
            data=expense_data, 
            files=files,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            return result.get('expense', {}).get('id')
        else:
            print(f"Error: {response.text}")
            return None
            
    finally:
        files['receipt'][1].close()
        if os.path.exists(receipt_path):
            os.remove(receipt_path)

def test_expense_submission_manual(token: str):
    """Test manual expense submission without receipt."""
    print("\n📝 Testing Manual Expense Submission...")
    
    expense_data = {
        'amount': '25.50',
        'currency': 'USD',
        'category': 'Transportation',
        'description': 'Taxi to client meeting',
        'date': '2025-10-04'
    }
    
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/expenses/submit/", json=expense_data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json().get('expense', {}).get('id')
    return None

def test_expense_list(token: str):
    """Test expense listing with filters."""
    print("\n📋 Testing Expense List...")
    
    headers = {"Authorization": f"Token {token}"}
    
    # Test basic list
    response = requests.get(f"{BASE_URL}/expenses/list/", headers=headers)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Found {result.get('pagination', {}).get('total_count', 0)} expenses")
    
    # Test with filters
    params = {
        'category': 'Meals',
        'status': 'draft',
        'page_size': 5
    }
    
    response = requests.get(f"{BASE_URL}/expenses/list/", headers=headers, params=params)
    print(f"\nFiltered results (Meals, draft): {response.status_code}")
    if response.status_code == 200:
        filtered_result = response.json()
        print(f"Filtered count: {len(filtered_result.get('expenses', []))}")

def test_user_expenses(token: str, user_id: str = None):
    """Test getting expenses for specific user."""
    print(f"\n👤 Testing User Expenses {f'(User ID: {user_id})' if user_id else '(My Expenses)'}...")
    
    headers = {"Authorization": f"Token {token}"}
    
    if user_id:
        url = f"{BASE_URL}/expenses/{user_id}/"
    else:
        url = f"{BASE_URL}/expenses/my/"
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        user_info = result.get('user', {})
        expenses = result.get('expenses', [])
        print(f"User: {user_info.get('name')} ({user_info.get('email')})")
        print(f"Total expenses: {len(expenses)}")
        
        if expenses:
            print("Recent expenses:")
            for expense in expenses[:3]:
                print(f"  - {expense.get('category')}: ${expense.get('amount')} ({expense.get('status')})")
    else:
        print(f"Error: {response.text}")

def test_admin_create_expense_for_user(admin_token: str, employee_email: str):
    """Test admin creating expense for another user."""
    print(f"\n👨‍💼 Testing Admin Creating Expense for Employee ({employee_email})...")
    
    # First, get the employee's user ID
    headers = {"Authorization": f"Token {admin_token}"}
    users_response = requests.get(f"{BASE_URL}/users/", headers=headers)
    
    if users_response.status_code != 200:
        print("Failed to get users list")
        return
    
    users = users_response.json().get('users', [])
    employee = next((u for u in users if u['email'] == employee_email), None)
    
    if not employee:
        print(f"Employee {employee_email} not found")
        return
    
    # Create expense for the employee
    expense_data = {
        'owner_id': employee['id'],
        'amount': '75.00',
        'currency': 'USD',
        'category': 'Office Supplies',
        'description': 'Office supplies purchased by admin for employee',
        'date': '2025-10-04'
    }
    
    response = requests.post(f"{BASE_URL}/expenses/submit/", json=expense_data, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 201:
        result = response.json()
        print(f"Created expense ID: {result.get('expense', {}).get('id')}")
        print(f"Owner: {result.get('expense', {}).get('owner_name')}")
    else:
        print(f"Error: {response.text}")

def main():
    """Run all expense API tests."""
    print("🚀 Starting Expense Submission API Tests")
    print("=" * 60)
    
    # Login as admin
    print("🔑 Logging in as admin...")
    admin_token = login_user("admin@techcorp.com", "admin123")
    
    if not admin_token:
        print("❌ Admin login failed. Cannot proceed with tests.")
        return
    
    print("✅ Admin login successful")
    
    # Test 1: Expense submission with receipt OCR
    expense_id_1 = test_expense_submission_with_receipt(admin_token)
    
    # Test 2: Manual expense submission
    expense_id_2 = test_expense_submission_manual(admin_token)
    
    # Test 3: List expenses with filters
    test_expense_list(admin_token)
    
    # Test 4: Get current user's expenses
    test_user_expenses(admin_token)
    
    # Test 5: Admin creating expense for employee
    test_admin_create_expense_for_user(admin_token, "employee1@techcorp.com")
    
    # Login as employee to test role-based access
    print("\n🔑 Logging in as employee...")
    employee_token = login_user("employee1@techcorp.com", "employee123")
    
    if employee_token:
        print("✅ Employee login successful")
        
        # Test 6: Employee viewing their own expenses
        test_user_expenses(employee_token)
        
        # Test 7: Employee trying to view admin expenses (should fail)
        print("\n🚫 Testing Employee Access to Admin Expenses (should fail)...")
        users_response = requests.get(f"{BASE_URL}/users/", headers={"Authorization": f"Token {admin_token}"})
        if users_response.status_code == 200:
            admin_user = next(u for u in users_response.json()['users'] if u['role'] == 'admin')
            test_user_expenses(employee_token, admin_user['id'])
    
    print("\n✅ All Expense API tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()