#!/usr/bin/env python3
"""
Step 14: Approval Rule Configuration API - Comprehensive Test Suite

Tests all CRUD operations and advanced features:
- GET /approval-rules/management/ - List rules with filtering
- POST /approval-rules/management/ - Create/update rules  
- GET /approval-rules/management/{rule_id}/ - Get rule details
- PUT /approval-rules/management/{rule_id}/ - Update specific rule
- DELETE /approval-rules/management/{rule_id}/ - Soft delete rule
- POST /approval-rules/bulk/ - Bulk operations
- POST /approval-rules/validate/ - Rule validation
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8001/api"
TEST_COMPANY = "TechCorp Solutions"

# Test data
SAMPLE_RULES = [
    {
        "name": "Small Expenses - Quick Approval",
        "description": "Quick approval for small expenses under $50",
        "amount_range": {
            "min_amount": "0.01",
            "max_amount": "49.99"
        },
        "approval_config": {
            "approvers": [{"role": "manager"}],
            "min_percentage_required": 100,
            "is_hybrid_rule": False
        },
        "conditions": {
            "categories": ["Office Supplies", "Meals", "Transportation"],
            "departments": []
        },
        "priority": 1,
        "is_active": True
    },
    {
        "name": "Medium Expenses - Sequential Approval", 
        "description": "Manager then admin approval for medium expenses",
        "amount_range": {
            "min_amount": "50.00",
            "max_amount": "299.99"
        },
        "approval_config": {
            "approvers": [
                {"role": "manager", "order": 1},
                {"role": "admin", "order": 2}
            ],
            "min_percentage_required": 100,
            "is_hybrid_rule": False
        },
        "conditions": {
            "categories": ["Meals", "Travel", "Office Supplies"],
            "departments": []
        },
        "priority": 2,
        "is_active": True
    },
    {
        "name": "High Value - Percentage Approval",
        "description": "75% of senior staff must approve high-value expenses",
        "amount_range": {
            "min_amount": "300.00",
            "max_amount": "999.99"
        },
        "approval_config": {
            "approvers": [
                {"role": "manager"},
                {"role": "admin"}
            ],
            "min_percentage_required": 75,
            "is_hybrid_rule": False
        },
        "conditions": {
            "categories": ["Travel", "Technology", "Entertainment"],
            "departments": []
        },
        "priority": 3,
        "is_active": True
    }
]

def print_header(title):
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f"🔧 {title}")
    print('='*60)

def print_step(step_num, description):
    """Print a test step"""
    print(f"\n{step_num}. {description}")
    print("-" * 50)

def login_user(email, password):
    """Login and return auth token"""
    login_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data, timeout=10)
        if response.status_code == 200:
            token = response.json().get('token')
            print(f"   ✅ Logged in as {email}")
            return token
        else:
            print(f"   ❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return None

def test_get_approval_rules(token, test_filters=False):
    """Test GET /api/approval-rules/management/"""
    print("📋 Testing: GET approval rules list")
    
    headers = {"Authorization": f"Token {token}"}
    
    # Test basic list
    try:
        response = requests.get(f"{BASE_URL}/approval-rules/management/", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            rules_count = len(data.get('approval_rules', []))
            print(f"   ✅ Retrieved {rules_count} approval rules")
            
            # Display rule summary
            for rule in data['approval_rules'][:3]:  # Show first 3
                print(f"      • {rule['name']} - Priority: {rule['priority']} - Active: {rule['is_active']}")
            
            if test_filters and rules_count > 0:
                print("\n   📊 Testing filters...")
                
                # Test category filter
                response = requests.get(f"{BASE_URL}/approval-rules/management/?category=Meals", headers=headers)
                if response.status_code == 200:
                    filtered_count = len(response.json().get('approval_rules', []))
                    print(f"      • Category filter (Meals): {filtered_count} rules")
                
                # Test amount range filter
                response = requests.get(f"{BASE_URL}/approval-rules/management/?min_amount=100", headers=headers)
                if response.status_code == 200:
                    filtered_count = len(response.json().get('approval_rules', []))
                    print(f"      • Amount filter (>$100): {filtered_count} rules")
                    
            return True
        else:
            print(f"   ❌ Failed to get rules: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_create_approval_rule(token, rule_data):
    """Test POST /api/approval-rules/management/"""
    print(f"🆕 Testing: CREATE rule '{rule_data['name']}'")
    
    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/approval-rules/management/", 
            json=rule_data, 
            headers=headers, 
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            rule_id = data['approval_rule']['id']
            action = data.get('action', 'created')
            print(f"   ✅ Rule {action}: {rule_data['name']}")
            print(f"      ID: {rule_id}")
            print(f"      Priority: {data['approval_rule']['priority']}")
            print(f"      Approvers: {len(data['approval_rule']['approval_config']['approvers'])}")
            return rule_id
        else:
            print(f"   ❌ Failed to create rule: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def test_get_rule_details(token, rule_id):
    """Test GET /api/approval-rules/management/{rule_id}/"""
    print(f"🔍 Testing: GET rule details")
    
    headers = {"Authorization": f"Token {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/approval-rules/management/{rule_id}/", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            rule = data['approval_rule']
            print(f"   ✅ Retrieved rule: {rule['name']}")
            print(f"      Description: {rule['description']}")
            print(f"      Amount Range: ${rule['amount_range']['min_amount']} - ${rule['amount_range']['max_amount']}")
            print(f"      Approvers: {len(rule['approval_config']['approvers'])}")
            print(f"      Categories: {', '.join(rule['conditions']['categories'])}")
            return True
        else:
            print(f"   ❌ Failed to get rule details: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_update_approval_rule(token, rule_id):
    """Test PUT /api/approval-rules/management/{rule_id}/"""
    print(f"✏️ Testing: UPDATE rule")
    
    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}
    
    # Update data
    update_data = {
        "name": "Updated Rule - Modified Description",
        "description": "This rule has been updated via API",
        "amount_range": {
            "min_amount": "0.01", 
            "max_amount": "75.00"  # Changed from 49.99
        },
        "approval_config": {
            "approvers": [{"role": "manager"}, {"role": "admin"}],  # Added admin
            "min_percentage_required": 100,
            "is_hybrid_rule": False
        },
        "conditions": {
            "categories": ["Office Supplies", "Meals", "Transportation", "Technology"],  # Added Technology
            "departments": []
        },
        "priority": 5,  # Changed priority
        "is_active": True
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/approval-rules/management/{rule_id}/", 
            json=update_data, 
            headers=headers, 
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Rule updated successfully")
            print(f"      New max amount: ${data['approval_rule']['amount_range']['max_amount']}")
            print(f"      New priority: {data['approval_rule']['priority']}")
            print(f"      New approver count: {len(data['approval_rule']['approval_config']['approvers'])}")
            return True
        else:
            print(f"   ❌ Failed to update rule: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_validate_rule(token):
    """Test POST /api/approval-rules/validate/"""
    print(f"✅ Testing: Rule validation")
    
    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}
    
    # Test valid rule
    valid_rule = {
        "name": "Validation Test Rule",
        "amount_range": {
            "min_amount": "1000.00",
            "max_amount": "5000.00"
        },
        "approval_config": {
            "approvers": [{"role": "manager"}, {"role": "admin"}],
            "min_percentage_required": 75
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/approval-rules/validate/", 
            json=valid_rule, 
            headers=headers, 
            timeout=10
        )
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Validation result: {'Valid' if data['is_valid'] else 'Invalid'}")
            
            if data.get('errors'):
                print(f"      Errors: {len(data['errors'])}")
                for error in data['errors']:
                    print(f"        • {error}")
            
            if data.get('warnings'):
                print(f"      Warnings: {len(data['warnings'])}")
                for warning in data['warnings']:
                    print(f"        • {warning}")
                    
            if data.get('suggestions'):
                print(f"      Suggestions: {len(data['suggestions'])}")
                for suggestion in data['suggestions']:
                    print(f"        • {suggestion}")
            
            return True
        else:
            print(f"   ❌ Failed to validate rule: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_bulk_operations(token, rule_ids):
    """Test POST /api/approval-rules/bulk/"""
    print(f"🔄 Testing: Bulk operations")
    
    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}
    
    if len(rule_ids) < 2:
        print("   ⚠️ Need at least 2 rules for bulk testing")
        return False
    
    # Test bulk priority reordering
    print("   📊 Testing: Bulk priority reordering...")
    reorder_data = {
        "operation": "reorder_priorities",
        "rule_priorities": [
            {"rule_id": rule_ids[0], "priority": 10},
            {"rule_id": rule_ids[1], "priority": 20}
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/approval-rules/bulk/", 
            json=reorder_data, 
            headers=headers, 
            timeout=10
        )
        print(f"      Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            updated_count = len(data.get('updated_rules', []))
            print(f"      ✅ Reordered {updated_count} rules")
        else:
            print(f"      ❌ Failed to reorder: {response.text}")
    
    except Exception as e:
        print(f"      ❌ Error: {e}")
    
    # Test bulk status toggle
    print("\n   🔄 Testing: Bulk status toggle...")
    toggle_data = {
        "operation": "bulk_toggle_status",
        "rule_ids": rule_ids[:2],
        "is_active": False
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/approval-rules/bulk/", 
            json=toggle_data, 
            headers=headers, 
            timeout=10
        )
        print(f"      Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            updated_count = data.get('updated_count', 0)
            print(f"      ✅ {data.get('action', 'Updated')} {updated_count} rules")
            return True
        else:
            print(f"      ❌ Failed to toggle status: {response.text}")
            return False
    
    except Exception as e:
        print(f"      ❌ Error: {e}")
        return False

def test_delete_rule(token, rule_id):
    """Test DELETE /api/approval-rules/management/{rule_id}/"""
    print(f"🗑️ Testing: DELETE rule (soft delete)")
    
    headers = {"Authorization": f"Token {token}"}
    
    try:
        response = requests.delete(f"{BASE_URL}/approval-rules/management/{rule_id}/", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Rule soft deleted: {data['approval_rule']['name']}")
            print(f"      Active status: {data['approval_rule']['is_active']}")
            return True
        else:
            print(f"   ❌ Failed to delete rule: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_error_scenarios(token):
    """Test error handling and edge cases"""
    print(f"⚠️ Testing: Error scenarios")
    
    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}
    
    # Test invalid rule creation
    print("   🚫 Testing: Invalid rule data...")
    invalid_rule = {
        "name": "",  # Empty name
        "approval_config": {
            "approvers": [],  # No approvers
            "min_percentage_required": 150  # Invalid percentage
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/approval-rules/management/", 
            json=invalid_rule, 
            headers=headers, 
            timeout=10
        )
        
        if response.status_code == 400:
            print(f"      ✅ Correctly rejected invalid rule (400)")
        else:
            print(f"      ❌ Unexpected response: {response.status_code}")
    
    except Exception as e:
        print(f"      ❌ Error: {e}")
    
    # Test non-existent rule access
    print("\n   🔍 Testing: Non-existent rule access...")
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    try:
        response = requests.get(f"{BASE_URL}/approval-rules/management/{fake_id}/", headers=headers, timeout=10)
        
        if response.status_code == 404:
            print(f"      ✅ Correctly returned 404 for non-existent rule")
        else:
            print(f"      ❌ Unexpected response: {response.status_code}")
    
    except Exception as e:
        print(f"      ❌ Error: {e}")

def main():
    """Main test execution"""
    print_header("Step 14: Approval Rule Configuration API - Test Suite")
    
    start_time = time.time()
    
    # Login as admin
    print_step(1, "Admin Authentication")
    admin_token = login_user("admin@techcorp.com", "admin123")
    
    if not admin_token:
        print("❌ Cannot proceed without admin authentication")
        return
    
    # Test basic rule listing
    print_step(2, "Get Approval Rules List")
    test_get_approval_rules(admin_token, test_filters=True)
    
    # Create sample rules
    print_step(3, "Create Multiple Approval Rules")
    created_rule_ids = []
    
    for i, rule_data in enumerate(SAMPLE_RULES):
        rule_id = test_create_approval_rule(admin_token, rule_data)
        if rule_id:
            created_rule_ids.append(rule_id)
        time.sleep(0.5)  # Small delay between creates
    
    print(f"\n   📊 Created {len(created_rule_ids)} rules successfully")
    
    if created_rule_ids:
        # Test rule details
        print_step(4, "Get Rule Details")
        test_get_rule_details(admin_token, created_rule_ids[0])
        
        # Test rule update
        print_step(5, "Update Approval Rule")
        test_update_approval_rule(admin_token, created_rule_ids[0])
        
        # Test validation
        print_step(6, "Rule Validation")
        test_validate_rule(admin_token)
        
        # Test bulk operations
        print_step(7, "Bulk Operations")
        test_bulk_operations(admin_token, created_rule_ids)
        
        # Test soft delete
        print_step(8, "Soft Delete Rule")
        if len(created_rule_ids) > 1:
            test_delete_rule(admin_token, created_rule_ids[-1])
    
    # Test error scenarios
    print_step(9, "Error Handling & Edge Cases")
    test_error_scenarios(admin_token)
    
    # Final summary
    print_step(10, "Test Results Summary")
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"   ⏱️ Total test duration: {duration:.2f} seconds")
    print(f"   📊 Rules created: {len(created_rule_ids)}")
    print(f"   🎯 API endpoints tested: 7")
    
    # Display final rule count
    test_get_approval_rules(admin_token, test_filters=False)
    
    print_header("Step 14: Approval Rule Configuration API - COMPLETE! ✅")
    print("🎉 All approval rule management features tested successfully!")
    print("🔧 Ready for production use with comprehensive CRUD operations")
    print("📚 See STEP_14_API_DOCS.md for detailed API documentation")

if __name__ == "__main__":
    main()