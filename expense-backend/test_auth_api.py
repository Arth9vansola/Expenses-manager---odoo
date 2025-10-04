#!/usr/bin/env python3
"""
Authentication API Test Script

This script demonstrates all the authentication and user management endpoints:
- POST /api/signup/ - Sign up with company creation
- POST /api/login/ - User login
- GET /api/users/ - Get all users (admin only)
- POST /api/users/ - Create new user (admin only)  
- PUT /api/users/{id}/ - Update user (admin only)
- POST /api/logout/ - User logout
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_signup():
    """Test user signup and company creation"""
    print("🔐 Testing Signup...")
    
    signup_data = {
        "name": "John Doe",
        "email": "john.doe@newcompany.com", 
        "password": "securepass123",
        "company_name": "New Tech Solutions",
        "country": "United States"
    }
    
    response = requests.post(f"{BASE_URL}/signup/", json=signup_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json()["token"]
    return None

def test_login():
    """Test user login"""
    print("\n🔑 Testing Login...")
    
    login_data = {
        "email": "admin@techcorp.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{BASE_URL}/login/", json=login_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        return response.json()["token"]
    return None

def test_get_users(token):
    """Test getting all users (admin only)"""
    print("\n👥 Testing Get All Users...")
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.get(f"{BASE_URL}/users/", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.json() if response.status_code == 200 else None

def test_create_user(token):
    """Test creating a new user (admin only)"""
    print("\n➕ Testing Create New User...")
    
    user_data = {
        "name": "Alice Smith",
        "email": "alice.smith@techcorp.com",
        "role": "manager"
    }
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.post(f"{BASE_URL}/users/", json=user_data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.json() if response.status_code == 201 else None

def test_update_user(token, user_id):
    """Test updating a user (admin only)"""
    print(f"\n✏️ Testing Update User {user_id}...")
    
    update_data = {
        "role": "employee",
        "reset_password": True
    }
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.put(f"{BASE_URL}/users/{user_id}/", json=update_data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.json() if response.status_code == 200 else None

def test_logout(token):
    """Test user logout"""
    print("\n🚪 Testing Logout...")
    
    headers = {"Authorization": f"Token {token}"}
    response = requests.post(f"{BASE_URL}/logout/", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

def main():
    """Run all authentication tests"""
    print("🚀 Starting Authentication API Tests")
    print("=" * 50)
    
    # Test 1: Sign up new company and admin
    signup_token = test_signup()
    
    # Test 2: Login with existing admin 
    login_token = test_login()
    
    if login_token:
        # Test 3: Get all users
        users_data = test_get_users(login_token)
        
        # Test 4: Create a new user
        new_user = test_create_user(login_token)
        
        # Test 5: Update a user (use existing user ID)
        if users_data and users_data.get("users"):
            # Find a non-admin user to update
            target_user = None
            for user in users_data["users"]:
                if user["role"] != "admin":
                    target_user = user
                    break
            
            if target_user:
                test_update_user(login_token, target_user["id"])
        
        # Test 6: Logout
        test_logout(login_token)
    
    print("\n✅ All tests completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()