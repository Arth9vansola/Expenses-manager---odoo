# Step 16: Permissions & Validation - Complete API Documentation

## Overview

Step 16 implements comprehensive **Permissions & Validation** for the Expense Management System, ensuring secure access control and data integrity across all endpoints.

### 🔐 Key Features Implemented

1. **Role-Based Access Control (RBAC)**
2. **Comprehensive Data Validation** 
3. **Permission-Based Endpoint Protection**
4. **Security Middleware**
5. **Audit Logging**
6. **Rate Limiting**
7. **Input Sanitization**

---

## 🛡️ Security Architecture

### User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | • Full system access<br>• User management<br>• Approval rule management<br>• View all expenses<br>• Override permissions |
| **Manager** | • View team/company expenses<br>• Approve expenses<br>• Limited user management<br>• View company approval rules |
| **Employee** | • Manage own expenses<br>• View own data<br>• Submit expenses for approval |

### Permission Matrix

| Endpoint Category | Admin | Manager | Employee |
|-------------------|-------|---------|----------|
| User Management | ✅ Full | ⚠️ Limited | ❌ Self Only |
| Expense Management | ✅ All | ⚠️ Company/Team | ✅ Own Only |
| Approval Rules | ✅ Full | 👁️ View Only | ❌ None |
| Approvals | ✅ All | ✅ Assigned | ❌ None |
| Company Management | ✅ Full | ❌ None | ❌ None |

---

## 🔌 API Endpoints with Permissions

### Authentication Endpoints

#### POST `/api/login/`
**Description:** Authenticate user and get access token
**Permissions:** Public
**Rate Limit:** 5 requests per 5 minutes

```json
{
  "email": "user@company.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "abc123...",
    "user": {
      "id": 1,
      "email": "user@company.com",
      "role": "manager",
      "permissions": {
        "can_create_users": false,
        "can_manage_approval_rules": false,
        "can_view_all_expenses": true,
        "can_approve_expenses": true
      }
    }
  }
}
```

#### POST `/api/logout/`
**Description:** Invalidate current token
**Permissions:** Authenticated users only
**Headers:** `Authorization: Token <token>`

---

### 👥 Secure User Management

#### GET `/api/secure/users/`
**Description:** List users based on permissions
**Permissions:**
- **Admin:** See all users
- **Manager:** See company users  
- **Employee:** See self only

**Query Parameters:**
- `company_id` (Admin only)
- `role` (admin/manager/employee)
- `is_active` (true/false)

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 5 users",
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@company.com",
        "first_name": "John",
        "last_name": "Doe", 
        "role": "manager",
        "is_active": true,
        "company": {
          "id": 1,
          "name": "TechCorp"
        },
        "manager": {
          "id": 2,
          "name": "Jane Smith"
        }
      }
    ],
    "total_count": 5,
    "permissions": {
      "can_create": true,
      "can_see_all": true
    }
  }
}
```

#### POST `/api/secure/users/`
**Description:** Create new user
**Permissions:** Admin only
**Validation:** 
- Valid email format
- Unique email
- Valid role
- Name length (2-50 characters)

**Request:**
```json
{
  "email": "newuser@company.com",
  "first_name": "New",
  "last_name": "User",
  "role": "employee",
  "password": "secure123",
  "company_id": 1,
  "manager_id": 2
}
```

#### GET `/api/secure/users/{id}/`
**Description:** Get user details
**Permissions:**
- **Admin:** View any user
- **Manager:** View company users
- **Employee:** View self only

#### PUT `/api/secure/users/{id}/`
**Description:** Update user
**Permissions:**
- **Admin:** Update any user
- **Self:** Update own profile (limited fields)

**Validation:**
- Email format and uniqueness
- Name constraints
- Role restrictions (Admin only)
- Password complexity (if changing)

#### DELETE `/api/secure/users/{id}/`
**Description:** Delete user
**Permissions:** Admin only
**Business Logic:**
- Soft delete if user has expenses
- Hard delete if no associated data
- Cannot delete self
- Cannot delete admin (unless superuser)

---

### 💰 Secure Expense Management

#### GET `/api/secure/expenses/`
**Description:** List expenses with permission filtering
**Permissions:**
- **Admin:** All expenses
- **Manager:** Company/team expenses
- **Employee:** Own expenses only

**Query Parameters:**
- `status` (draft/pending_approval/approved/rejected)
- `category` (Travel/Meals/etc.)
- `start_date` / `end_date` (YYYY-MM-DD)
- `min_amount` / `max_amount`
- `user_id` (Admin/Manager only)

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": 1,
        "amount": "150.00",
        "currency": "USD",
        "description": "Business lunch",
        "category": "Meals",
        "status": "pending_approval",
        "expense_date": "2024-01-15",
        "user": {
          "id": 1,
          "name": "John Doe",
          "email": "john@company.com"
        },
        "current_approval_step": {
          "id": 1,
          "order": 1,
          "status": "pending"
        },
        "permissions": {
          "can_edit": false,
          "can_delete": false,
          "can_approve": true,
          "can_reject": true
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 25
    }
  }
}
```

#### POST `/api/secure/expenses/`
**Description:** Create new expense
**Permissions:** All authenticated users (for self)
**Validation:**
- Amount > 0 and <= $999,999.99
- Valid currency code
- Description 3-500 characters
- Valid category
- Date not in future
- Receipt path <= 255 characters

**Request:**
```json
{
  "amount": "125.50",
  "currency": "USD",
  "description": "Office supplies purchase",
  "category": "Office Supplies",
  "expense_date": "2024-01-15",
  "receipt_image": "receipts/receipt_123.jpg",
  "auto_submit": true
}
```

#### GET `/api/secure/expenses/{id}/`
**Description:** Get expense details
**Permissions:**
- **Admin:** Any expense
- **Manager:** Company/team expenses  
- **Employee:** Own expenses
- **Approver:** Expenses requiring approval

#### PUT `/api/secure/expenses/{id}/`
**Description:** Update expense
**Permissions:**
- **Owner:** Own expenses (draft only)
- **Admin:** Any expense (any status)

**Business Rules:**
- Only draft expenses can be edited (unless admin)
- Amount/category changes may trigger re-approval

#### POST `/api/secure/expenses/{id}/submit/`
**Description:** Submit expense for approval
**Permissions:** Owner or Admin
**Validation:**
- Expense must be in draft status
- Applicable approval rule must exist
- All required fields completed

#### POST `/api/secure/expenses/{id}/approve/`
**Description:** Approve expense at current step
**Permissions:** Assigned approver or Admin
**Validation:**
- User must be assigned to current approval step
- Expense must be in pending_approval status

**Request:**
```json
{
  "comment": "Approved - valid business expense"
}
```

#### POST `/api/secure/expenses/{id}/reject/`
**Description:** Reject expense
**Permissions:** Assigned approver or Admin
**Validation:**
- Rejection reason required
- User must be assigned to current approval step

**Request:**
```json
{
  "reason": "Receipt missing - please resubmit with documentation"
}
```

---

### 📋 Secure Approval Rules Management

#### GET `/api/secure/approval-rules/`
**Description:** List approval rules
**Permissions:**
- **Admin:** All rules
- **Manager:** Company rules (read-only)

**Response:**
```json
{
  "success": true,
  "data": {
    "approval_rules": [
      {
        "id": 1,
        "name": "Manager Approval $0-1000",
        "description": "Single manager approval for expenses under $1000",
        "is_active": true,
        "priority": 1,
        "company": {
          "id": 1,
          "name": "TechCorp"
        },
        "amount_range": {
          "min_amount": "0.00",
          "max_amount": "1000.00"
        },
        "approval_config": {
          "type": "sequential",
          "steps": [
            {
              "order": 1,
              "min_required": 1,
              "approvers": [2, 3]
            }
          ]
        },
        "usage_stats": {
          "expenses_processed": 25
        },
        "permissions": {
          "can_edit": true,
          "can_delete": true,
          "can_activate": true
        }
      }
    ]
  }
}
```

#### POST `/api/secure/approval-rules/`
**Description:** Create approval rule
**Permissions:** Admin only
**Validation:**
- Unique name per company
- Valid amount range (min <= max)
- No overlapping ranges
- Valid approver IDs
- Approvers must have manager/admin role
- Min required <= approver count

**Request:**
```json
{
  "name": "Two-Level Approval",
  "description": "Manager then Director approval for high amounts",
  "company_id": 1,
  "amount_range": {
    "min_amount": "1000.00",
    "max_amount": "5000.00"
  },
  "approval_config": {
    "type": "sequential",
    "steps": [
      {
        "order": 1,
        "min_required": 1,
        "approvers": [2]
      },
      {
        "order": 2, 
        "min_required": 1,
        "approvers": [3]
      }
    ]
  },
  "priority": 2
}
```

#### POST `/api/secure/approval-rules/validate/`
**Description:** Validate approval rule without saving
**Permissions:** Admin only
**Validation:** Complete rule validation including:
- Data format validation
- Business rule validation
- Approver availability
- Range overlap detection

#### GET `/api/secure/approval-rules/templates/`
**Description:** Get predefined rule templates
**Permissions:** Admin only

---

## 🔒 Security Features

### 1. Authentication & Authorization

**Token-Based Authentication:**
- JWT/Token authentication required for all secure endpoints
- Token validation on every request
- Automatic token expiration handling

**Role-Based Access Control:**
```python
@require_permissions(allowed_roles=['admin', 'manager'])
def secure_endpoint(request):
    # Only admin and manager can access
```

### 2. Data Validation

**Input Validation:**
- Field presence validation
- Data type validation 
- Format validation (email, dates, etc.)
- Range validation (amounts, lengths)
- Business rule validation

**Example Validation Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Enter a valid email address",
    "amount": "Amount must be greater than zero",
    "description": "Description must be at least 3 characters long"
  }
}
```

### 3. Security Middleware

**Rate Limiting:**
- Login: 5 attempts per 5 minutes
- Signup: 3 attempts per 10 minutes  
- Secure endpoints: 100 requests per 5 minutes
- Default: 200 requests per 5 minutes

**Request Validation:**
- SQL injection pattern detection
- Excessive parameter checking
- Request size limits (10MB)
- Content type validation

**Security Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 4. Audit Logging

**Logged Events:**
- All secure endpoint access
- Authentication attempts
- Permission denials
- Data modifications
- Failed requests

**Audit Log Format:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "method": "POST",
  "path": "/api/secure/expenses/",
  "user": {
    "id": 1,
    "email": "user@company.com",
    "role": "employee"
  },
  "client_ip": "192.168.1.100",
  "status_code": 201,
  "response_time_ms": 45.2
}
```

---

## ⚠️ Error Responses

### Common Error Formats

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "details": "You must be logged in to access this resource."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Permission denied", 
  "details": "Only admin users can access this resource."
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field_name": "Error description"
  }
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": "Too many requests. Try again in 300 seconds.",
  "retry_after": 300
}
```

---

## 🧪 Testing & Validation

### Permission Testing

Run comprehensive permission tests:
```bash
cd expense-backend
python test_step16_permissions.py
```

**Test Coverage:**
- ✅ Authentication validation
- ✅ Role-based access control
- ✅ Data validation rules
- ✅ Security middleware
- ✅ Workflow permissions
- ✅ Rate limiting
- ✅ Input sanitization

### Manual Testing Examples

**Test Admin User Creation:**
```bash
curl -X POST http://localhost:8000/api/secure/users/ \
  -H "Authorization: Token YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "first_name": "Test",
    "last_name": "User", 
    "role": "employee"
  }'
```

**Test Employee Expense Creation:**
```bash
curl -X POST http://localhost:8000/api/secure/expenses/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "50.00",
    "description": "Office lunch",
    "category": "Meals"
  }'
```

---

## 📊 Implementation Summary

### ✅ Completed Features

1. **Permission System**
   - Role-based access control
   - Object-level permissions
   - Permission decorators
   - Dynamic permission checking

2. **Data Validation** 
   - Comprehensive input validation
   - Business rule validation
   - Error message standardization
   - Cross-field validation

3. **Security Middleware**
   - Rate limiting
   - Request validation
   - Security headers
   - Audit logging

4. **API Enhancement**
   - Secure endpoint variants
   - Permission-aware responses
   - Detailed error messages
   - Consistent response format

### 🔧 Technical Details

**Files Created/Modified:**
- `expenses/permissions.py` - Permission classes and validation
- `expenses/secure_user_api.py` - Secure user management
- `expenses/secure_expense_api.py` - Secure expense management
- `expenses/secure_approval_rules_api.py` - Secure approval rules
- `expenses/security_middleware.py` - Security middleware
- `expenses/urls.py` - Updated with secure endpoints
- `test_step16_permissions.py` - Comprehensive testing

**Dependencies:**
- Django REST Framework permissions
- Token authentication
- Django caching framework
- Python decorators
- JSON validation

---

## 🚀 Next Steps

After Step 16 implementation:

1. **Frontend Integration**
   - Update UI to use secure endpoints
   - Implement permission-based UI elements
   - Add validation feedback

2. **Advanced Security**
   - OAuth2 integration
   - Multi-factor authentication
   - Session management
   - API versioning

3. **Monitoring & Analytics**
   - Security event monitoring
   - Performance metrics
   - User behavior analytics
   - Compliance reporting

---

**Step 16: Permissions & Validation - IMPLEMENTATION COMPLETE** ✅

The expense management system now has enterprise-grade security with comprehensive permissions, validation, and audit capabilities. All endpoints are protected with role-based access control and thorough data validation ensures system integrity.