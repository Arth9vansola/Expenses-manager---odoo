#!/usr/bin/env python3
"""
Test frontend to backend login flow
"""
import requests
import json

def test_frontend_login_flow():
    """Test the exact API call that the frontend makes"""
    print("🧪 Testing Frontend Login Flow")
    print("=" * 50)
    
    # The exact URL the frontend should be calling
    frontend_url = "http://localhost:8000/api/login/"
    
    login_data = {
        "email": "admin@test.com", 
        "password": "admin123"
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        # Add CORS headers that might be needed
        "Origin": "http://localhost:3001",
        "Referer": "http://localhost:3001/"
    }
    
    try:
        print(f"Making POST request to: {frontend_url}")
        print(f"Headers: {json.dumps(headers, indent=2)}")
        print(f"Data: {json.dumps(login_data, indent=2)}")
        
        response = requests.post(
            frontend_url, 
            json=login_data, 
            headers=headers,
            timeout=10
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ Login successful!")
                print(f"Response: {json.dumps(result, indent=2)}")
                return result.get('token')
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"Raw response: {response.text}")
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
    test_frontend_login_flow()