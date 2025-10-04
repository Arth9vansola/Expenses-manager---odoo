#!/usr/bin/env python3
"""
Quick API validation script to test basic endpoints before running full test suite
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8001/api"

def test_login():
    """Test admin login"""
    print("🔑 Testing admin login...")
    login_data = {
        "email": "admin@techcorp.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login/", json=login_data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('token')
            print(f"   ✅ Login successful, token: {token[:20]}...")
            return token
        else:
            print(f"   ❌ Login failed: {response.text}")
            return None
    except requests.exceptions.ConnectionError as e:
        print(f"   ❌ Connection failed: {e}")
        return None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None

def test_approval_rules(token):
    """Test approval rules endpoint"""
    print("\n📋 Testing approval rules endpoint...")
    
    headers = {"Authorization": f"Token {token}"}
    try:
        response = requests.get(f"{BASE_URL}/approval-rules/", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            rules_count = len(data.get('approval_rules', []))
            print(f"   ✅ Found {rules_count} approval rules")
            return True
        else:
            print(f"   ❌ Failed to get rules: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    print("🚀 Quick API Validation")
    print("=" * 40)
    
    # Test login
    token = test_login()
    
    if token:
        # Test approval rules
        test_approval_rules(token)
        print("\n✅ Basic API validation complete!")
        print("🎯 Ready to run full test suite: python test_approval_api.py")
    else:
        print("\n❌ API validation failed - check server status")

if __name__ == "__main__":
    main()