#!/usr/bin/env python3
"""
Simple login test to debug the authentication issue
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_login():
    """Test user login with detailed error handling"""
    print("🔑 Testing Login...")
    
    login_data = {
        "email": "admin@test.com", 
        "password": "admin123"
    }
    
    try:
        print(f"Making POST request to: {BASE_URL}/login/")
        print(f"Login data: {json.dumps(login_data, indent=2)}")
        
        response = requests.post(f"{BASE_URL}/login/", json=login_data, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Raw Response Text: '{response.text}'")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ Login successful!")
                print(f"Response: {json.dumps(result, indent=2)}")
                return result.get('token')
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                return None
        else:
            print(f"❌ Login failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw error response: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Simple Login Test")
    print("=" * 50)
    test_login()