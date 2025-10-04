# Authentication & User Management API Documentation

## Overview
This document describes the authentication and user management endpoints for the Expense Management System.

## Base URL
```
http://127.0.0.1:8000/api
```

## Authentication
Most endpoints require token authentication. Include the token in the Authorization header:
```
Authorization: Token <your-token-here>
```

---

## 🔐 Authentication Endpoints

### 1. Sign Up
Creates a new company and admin user.

**Endpoint:** `POST /signup/`  
**Authentication:** None required  
**Permissions:** Public access

#### Request Body:
```json
{
    "name": "John Doe",
    "email": "john.doe@company.com",
    "password": "securepass123",
    "company_name": "Tech Solutions Inc",
    "country": "United States"
}
```

#### Response (201 Created):
```json
{
    "message": "Company and admin user created successfully",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "user": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "John Doe",
        "email": "john.doe@company.com",
        "role": "admin",
        "company": "123e4567-e89b-12d3-a456-426614174001",
        "is_active": true,
        "created_at": "2025-10-04T14:00:00Z"
    },
    "company": {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "name": "Tech Solutions Inc",
        "country": "United States",
        "currency": "USD",
        "settings": {
            "expense_categories": ["Travel", "Meals", "Office Supplies", "Transportation", "Other"],
            "approval_required": true,
            "default_expense_limit": 1000
        }
    }
}
```

#### Supported Countries & Currencies:
- **United States** → USD
- **United Kingdom** → GBP
- **Canada** → CAD
- **Germany, France, Spain, Italy** → EUR
- **Japan** → JPY
- **India** → INR
- **And 25+ more countries...**

---

### 2. Login
Authenticates a user and returns an access token.

**Endpoint:** `POST /login/`  
**Authentication:** None required  
**Permissions:** Public access

#### Request Body:
```json
{
    "email": "admin@techcorp.com",
    "password": "admin123"
}
```

#### Response (200 OK):
```json
{
    "message": "Login successful",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "user": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Admin User",
        "email": "admin@techcorp.com",
        "role": "admin",
        "company": "123e4567-e89b-12d3-a456-426614174001",
        "is_active": true
    }
}
```

#### Error Response (401 Unauthorized):
```json
{
    "error": "Invalid credentials"
}
```

---

### 3. Logout
Invalidates the user's current token.

**Endpoint:** `POST /logout/`  
**Authentication:** Token required  
**Permissions:** Authenticated users

#### Request Headers:
```
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

#### Response (200 OK):
```json
{
    "message": "Successfully logged out"
}
```

---

## 👥 User Management Endpoints

### 4. Get All Users
Retrieves all users in the admin's company.

**Endpoint:** `GET /users/`  
**Authentication:** Token required  
**Permissions:** Admin only

#### Request Headers:
```
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

#### Response (200 OK):
```json
{
    "users": [
        {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "name": "Admin User",
            "email": "admin@techcorp.com",
            "role": "admin",
            "company": "123e4567-e89b-12d3-a456-426614174001",
            "manager": null,
            "is_active": true,
            "created_at": "2025-10-04T14:00:00Z"
        },
        {
            "id": "456e7890-e12b-34d5-a678-901234567890",
            "name": "Manager One",
            "email": "manager1@techcorp.com",
            "role": "manager",
            "company": "123e4567-e89b-12d3-a456-426614174001",
            "manager": null,
            "is_active": true,
            "created_at": "2025-10-04T14:01:00Z"
        }
    ],
    "total_count": 2
}
```

---

### 5. Create User
Creates a new manager or employee user.

**Endpoint:** `POST /users/`  
**Authentication:** Token required  
**Permissions:** Admin only

#### Request Body:
```json
{
    "name": "Alice Smith",
    "email": "alice.smith@techcorp.com",
    "role": "manager",
    "manager_id": "456e7890-e12b-34d5-a678-901234567890"
}
```

#### Response (201 Created):
```json
{
    "message": "User created successfully. Temporary password: tempAlic123",
    "user": {
        "id": "789e0123-e45f-67g8-h901-234567890123",
        "name": "Alice Smith",
        "email": "alice.smith@techcorp.com",
        "role": "manager",
        "company": "123e4567-e89b-12d3-a456-426614174001",
        "manager": "456e7890-e12b-34d5-a678-901234567890",
        "is_active": true,
        "created_at": "2025-10-04T14:05:00Z"
    },
    "temporary_password": "tempAlic123"
}
```

#### Validation Rules:
- `role`: Must be "manager" or "employee"
- `manager_id`: Optional UUID, must reference an existing manager
- `email`: Must be unique across the system

---

### 6. Update User
Updates user role, manager assignment, or resets password.

**Endpoint:** `PUT /users/{user_id}/`  
**Authentication:** Token required  
**Permissions:** Admin only

#### Request Body (all fields optional):
```json
{
    "role": "employee",
    "manager_id": "456e7890-e12b-34d5-a678-901234567890",
    "reset_password": true
}
```

#### Response (200 OK):
```json
{
    "message": "User updated successfully. Updated fields: role, manager, password",
    "user": {
        "id": "789e0123-e45f-67g8-h901-234567890123",
        "name": "Alice Smith",
        "email": "alice.smith@techcorp.com",
        "role": "employee",
        "company": "123e4567-e89b-12d3-a456-426614174001",
        "manager": "456e7890-e12b-34d5-a678-901234567890",
        "is_active": true,
        "updated_at": "2025-10-04T14:10:00Z"
    },
    "new_password": "resetAlic123"
}
```

---

## 🔒 Security Features

### Password Security
- Passwords are hashed using Django's PBKDF2 algorithm
- Minimum password length: 6 characters
- Temporary passwords generated for new users and password resets

### Token Authentication
- Secure token-based authentication using Django REST Framework tokens
- Tokens are automatically generated on login/signup
- Tokens can be invalidated via logout endpoint

### Role-Based Access Control
- **Admin**: Full access to all company data and user management
- **Manager**: Can manage expenses and subordinate employees
- **Employee**: Can create and view own expenses

### Data Isolation
- Users can only access data within their own company
- UUID primary keys for enhanced security
- Proper foreign key constraints and validation

---

## 🧪 Testing the API

### Using curl:
```bash
# Sign up
curl -X POST http://127.0.0.1:8000/api/signup/ \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@company.com","password":"pass123","company_name":"My Company","country":"United States"}'

# Login  
curl -X POST http://127.0.0.1:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@techcorp.com","password":"admin123"}'

# Get users (replace TOKEN with actual token)
curl -X GET http://127.0.0.1:8000/api/users/ \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

### Using the Test Script:
```bash
cd expense-backend
python test_auth_api.py
```

---

## 📝 Error Handling

### Common Error Responses:

#### 400 Bad Request - Validation Error:
```json
{
    "email": ["A user with this email already exists."],
    "country": ["Unsupported country. Supported countries: United States, Canada, ..."]
}
```

#### 401 Unauthorized - Authentication Error:
```json
{
    "error": "Invalid credentials"
}
```

#### 403 Forbidden - Permission Denied:
```json
{
    "error": "Permission denied"
}
```

#### 404 Not Found - Resource Not Found:
```json
{
    "error": "User not found"
}
```

---

## 🎯 Next Steps

1. **Frontend Integration**: Connect React frontend to these API endpoints
2. **JWT Tokens**: Consider upgrading to JWT for stateless authentication
3. **Password Reset**: Add email-based password reset functionality
4. **Email Verification**: Add email verification for new signups
5. **Rate Limiting**: Implement API rate limiting for security
6. **Audit Logging**: Track user actions for compliance