#!/usr/bin/env python3
"""
Approval Workflow API Test Script

This script demonstrates the comprehensive approval workflow system:
- GET /api/approvals/{approver_id}/ - Get pending expenses for approver
- POST /api/approvals/{expense_id}/review/ - Approve/reject expense
- GET /api/expenses/{expense_id}/approval-history/ - View approval history
- Testing different approval strategies (sequential, percentage, special approver)
"""

import requests
import json
import time
from typing import Dict, List, Optional

BASE_URL = "http://127.0.0.1:8001/api"

def login_user(email: str, password: str) -> Optional[str]:
    """Login and return auth token."""
    login_data = {"email": email, "password": password}
    
    response = requests.post(f"{BASE_URL}/login/", json=login_data)
    if response.status_code == 200:
        return response.json()["token"]
    else:
        print(f"Login failed for {email}: {response.text}")
        return None

def get_all_users(admin_token: str) -> List[Dict]:
    """Get all users in the company."""
    headers = {"Authorization": f"Token {admin_token}"}
    response = requests.get(f"{BASE_URL}/users/", headers=headers)
    
    if response.status_code == 200:
        return response.json().get("users", [])
    else:
        print(f"Failed to get users: {response.text}")
        return []

def create_test_expense(token: str, owner_id: str = None, amount: str = "150.00") -> Optional[str]:
    """Create a test expense that requires approval."""
    expense_data = {
        "amount": amount,
        "currency": "USD", 
        "category": "Meals",
        "description": f"Business lunch requiring approval - ${amount}",
        "date": "2025-10-04"
    }
    
    if owner_id:
        expense_data["owner_id"] = owner_id
    
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/expenses/submit/", json=expense_data, headers=headers)
    
    if response.status_code == 201:
        expense_id = response.json()["expense"]["id"]
        print(f"✅ Created test expense: {expense_id} (${amount})")
        return expense_id
    else:
        print(f"❌ Failed to create expense: {response.text}")
        return None

def get_pending_approvals(token: str, approver_id: str) -> Dict:
    """Get all pending approvals for a specific approver."""
    print(f"\n📋 Getting pending approvals for approver {approver_id}...")
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.get(f"{BASE_URL}/approvals/{approver_id}/", headers=headers)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        approver = result.get("approver", {})
        pending = result.get("pending_expenses", [])
        summary = result.get("summary", {})
        
        print(f"\n📊 Approval Summary for {approver.get('name')}:")
        print(f"   • Total pending: {len(pending)}")
        print(f"   • Total amount: ${summary.get('total_amount', '0.00')}")
        print(f"   • Categories: {summary.get('categories', {})}")
        print(f"   • High value (>$1000): {summary.get('high_value_count', 0)}")
        
        return result
    else:
        print(f"Error: {response.text}")
        return {}

def approve_expense(token: str, expense_id: str, approver_id: str, 
                   action: str = "approve", comment: str = "") -> Dict:
    """Approve or reject a specific expense."""
    print(f"\n✅ {action.title()}ing expense {expense_id}...")
    
    review_data = {
        "approver_id": approver_id,
        "action": action,
        "comment": comment or f"Expense {action}d via API test"
    }
    
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(f"{BASE_URL}/approvals/{expense_id}/review/", 
                           json=review_data, headers=headers)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        review_result = result.get("review_result", {})
        expense = result.get("expense", {})
        
        print(f"\n🎯 Review Result:")
        print(f"   • Action: {review_result.get('action')}")
        print(f"   • New status: {expense.get('status')}")
        print(f"   • Message: {review_result.get('message')}")
        
        if review_result.get("next_approver"):
            next_approver = review_result["next_approver"]
            print(f"   • Next approver: {next_approver.get('name')} ({next_approver.get('role')})")
        
        return result
    else:
        print(f"Error: {response.text}")
        return {}

def get_approval_history(token: str, expense_id: str) -> Dict:
    """Get complete approval history for an expense."""
    print(f"\n📜 Getting approval history for expense {expense_id}...")
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.get(f"{BASE_URL}/expenses/{expense_id}/approval-history/", headers=headers)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        expense = result.get("expense", {})
        history = result.get("approval_history", [])
        workflow_status = result.get("workflow_status", {})
        
        print(f"\n📋 Expense: {expense.get('description')} (${expense.get('amount')})")
        print(f"   • Status: {expense.get('status')}")
        print(f"   • Workflow: {workflow_status.get('message', 'Unknown')}")
        
        print(f"\n🔄 Approval History ({len(history)} steps):")
        for i, step in enumerate(history, 1):
            approver = step.get("approver", {})
            print(f"   {i}. {approver.get('name')} ({approver.get('role')}) - {step.get('status').upper()}")
            if step.get("comment"):
                print(f"      Comment: {step.get('comment')}")
        
        return result
    else:
        print(f"Error: {response.text}")
        return {}

def test_sequential_approval_workflow(admin_token: str, users: List[Dict]):
    """Test a complete sequential approval workflow."""
    print("\n" + "="*60)
    print("🔄 Testing Sequential Approval Workflow")
    print("="*60)
    
    # Find different user roles
    admin = next((u for u in users if u['role'] == 'admin'), None)
    manager = next((u for u in users if u['role'] == 'manager'), None) 
    employee = next((u for u in users if u['role'] == 'employee'), None)
    
    if not all([admin, manager, employee]):
        print("❌ Missing required user roles for testing")
        return
    
    print(f"👨‍💼 Admin: {admin['name']} ({admin['email']})")
    print(f"👔 Manager: {manager['name']} ({manager['email']})")
    print(f"👤 Employee: {employee['name']} ({employee['email']})")
    
    # Step 1: Create expense that requires approval
    expense_id = create_test_expense(admin_token, employee['id'], "450.00")
    if not expense_id:
        return
    
    # Step 2: Check manager's pending approvals
    get_pending_approvals(admin_token, manager['id'])
    
    # Step 3: Manager approves the expense
    manager_token = login_user(manager['email'], "manager123")
    if manager_token:
        approve_expense(manager_token, expense_id, manager['id'], "approve", 
                      "Approved - legitimate business expense")
    
    # Step 4: Check if admin approval is needed
    get_pending_approvals(admin_token, admin['id'])
    
    # Step 5: Admin final approval (if needed)
    approve_expense(admin_token, expense_id, admin['id'], "approve",
                   "Final approval - expense processed")
    
    # Step 6: View complete approval history
    get_approval_history(admin_token, expense_id)

def test_rejection_workflow(admin_token: str, users: List[Dict]):
    """Test expense rejection workflow."""
    print("\n" + "="*60)
    print("❌ Testing Rejection Workflow")
    print("="*60)
    
    manager = next((u for u in users if u['role'] == 'manager'), None)
    employee = next((u for u in users if u['role'] == 'employee'), None)
    
    if not all([manager, employee]):
        print("❌ Missing required users for rejection test")
        return
    
    # Create expense
    expense_id = create_test_expense(admin_token, employee['id'], "85.50")
    if not expense_id:
        return
    
    # Manager rejects the expense
    manager_token = login_user(manager['email'], "manager123")
    if manager_token:
        approve_expense(manager_token, expense_id, manager['id'], "reject",
                      "Insufficient documentation provided")
    
    # View rejection history
    get_approval_history(admin_token, expense_id)

def test_high_value_expense(admin_token: str, users: List[Dict]):
    """Test high-value expense requiring multiple approvals."""
    print("\n" + "="*60)
    print("💰 Testing High-Value Expense Workflow")
    print("="*60)
    
    employee = next((u for u in users if u['role'] == 'employee'), None)
    
    if not employee:
        print("❌ No employee found for high-value test")
        return
    
    # Create high-value expense
    expense_id = create_test_expense(admin_token, employee['id'], "2500.00")
    if not expense_id:
        return
    
    # Check what approvals are required
    get_approval_history(admin_token, expense_id)
    
    # Check pending approvals for different roles
    for user in users:
        if user['role'] in ['manager', 'admin']:
            pending = get_pending_approvals(admin_token, user['id'])
            
            # If user has pending approvals, approve one
            if pending.get('pending_expenses'):
                user_token = login_user(user['email'], 
                                      'manager123' if user['role'] == 'manager' else 'admin123')
                if user_token:
                    approve_expense(user_token, expense_id, user['id'], "approve",
                                  f"High-value expense approved by {user['role']}")
                    break

def test_permission_boundaries(admin_token: str, users: List[Dict]):
    """Test permission boundaries and access controls."""
    print("\n" + "="*60)
    print("🔒 Testing Permission Boundaries")
    print("="*60)
    
    employee = next((u for u in users if u['role'] == 'employee'), None)
    manager = next((u for u in users if u['role'] == 'manager'), None)
    
    if not all([employee, manager]):
        print("❌ Missing users for permission test")
        return
    
    employee_token = login_user(employee['email'], "employee123")
    if not employee_token:
        return
    
    # Test 1: Employee trying to view manager's pending approvals (should fail)
    print("🧪 Test: Employee accessing manager's pending approvals...")
    headers = {"Authorization": f"Token {employee_token}"}
    response = requests.get(f"{BASE_URL}/approvals/{manager['id']}/", headers=headers)
    print(f"   Status: {response.status_code} {'✅ PASS' if response.status_code == 403 else '❌ FAIL'}")
    
    # Test 2: Employee trying to approve expense (should fail)
    expense_id = create_test_expense(admin_token, employee['id'], "75.00")
    if expense_id:
        print("🧪 Test: Employee trying to approve own expense...")
        review_data = {
            "approver_id": employee['id'],
            "action": "approve",
            "comment": "Self-approval attempt"
        }
        response = requests.post(f"{BASE_URL}/approvals/{expense_id}/review/", 
                               json=review_data, headers=headers)
        print(f"   Status: {response.status_code} {'✅ PASS' if response.status_code in [400, 403] else '❌ FAIL'}")

def get_approval_rules(admin_token: str):
    """Get all approval rules for the company."""
    print("\n📋 Getting Approval Rules...")
    
    headers = {"Authorization": f"Token {admin_token}"}
    response = requests.get(f"{BASE_URL}/approval-rules/", headers=headers)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        rules = result.get("approval_rules", [])
        
        print(f"\n📊 Company Approval Rules ({len(rules)} rules):")
        for rule in rules:
            print(f"\n   📋 {rule.get('name')}")
            print(f"      • Amount range: ${rule.get('min_amount', '0')} - ${rule.get('max_amount', '∞')}")
            print(f"      • Strategy: {rule.get('approval_flow', {}).get('strategy', 'unknown')}")
            print(f"      • Active: {'✅' if rule.get('is_active') else '❌'}")
            
            if rule.get('conditions'):
                conditions = rule['conditions']
                if conditions.get('categories'):
                    print(f"      • Categories: {', '.join(conditions['categories'])}")
        
        return result
    else:
        print(f"Error: {response.text}")
        return {}

def main():
    """Run comprehensive approval workflow tests."""
    print("🚀 Starting Approval Workflow API Tests")
    print("=" * 60)
    
    # Login as admin
    print("🔑 Logging in as admin...")
    admin_token = login_user("admin@techcorp.com", "admin123")
    
    if not admin_token:
        print("❌ Admin login failed. Cannot proceed with tests.")
        return
    
    print("✅ Admin login successful")
    
    # Get all users
    users = get_all_users(admin_token)
    if not users:
        print("❌ Failed to get users. Cannot proceed with tests.")
        return
    
    print(f"✅ Found {len(users)} users in company")
    
    # Get approval rules
    get_approval_rules(admin_token)
    
    # Test 1: Sequential approval workflow
    test_sequential_approval_workflow(admin_token, users)
    
    # Test 2: Rejection workflow
    test_rejection_workflow(admin_token, users)
    
    # Test 3: High-value expense
    test_high_value_expense(admin_token, users)
    
    # Test 4: Permission boundaries
    test_permission_boundaries(admin_token, users)
    
    print("\n✅ All Approval Workflow tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()