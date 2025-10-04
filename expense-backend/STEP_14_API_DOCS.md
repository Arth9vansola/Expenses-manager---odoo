# Step 14: Approval Rule Configuration API Documentation

## 🎯 Overview

This document describes the **Approval Rule Configuration API** that provides comprehensive CRUD operations for managing approval rules dynamically. These endpoints allow administrators to create, update, and manage approval rules with advanced configuration options including ordered approver lists, percentage thresholds, specific approver assignments, and hybrid rule settings.

## 🔧 Base Configuration

**Base URL:** `http://127.0.0.1:8001/api`  
**Authentication:** Token-based (include `Authorization: Token <your-token>` in headers)

---

## 🔄 Approval Rule Management Endpoints

### **GET /api/approval-rules/management/** - List All Approval Rules

Retrieves all approval rules for the user's company with advanced filtering and rich metadata.

#### **Features:**
- ✅ **Company-scoped rules** - Only shows rules for user's company
- ✅ **Advanced filtering** - By category, amount range, active status
- ✅ **Rich metadata** - Complete configuration and usage statistics
- ✅ **Priority ordering** - Rules ordered by priority and creation date

#### **Access Control:**
- **Managers:** Can view all company rules (read-only)
- **Admins:** Can view all company rules with full details

#### **Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `show_inactive` | Boolean | Include inactive rules | `?show_inactive=true` |
| `category` | String | Filter by category | `?category=Travel` |
| `min_amount` | Decimal | Minimum amount filter | `?min_amount=100.00` |
| `max_amount` | Decimal | Maximum amount filter | `?max_amount=500.00` |

#### **Response Example:**
```json
{
  "approval_rules": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Medium Value Expenses",
      "description": "Manager then admin approval for medium expenses",
      "priority": 2,
      "is_active": true,
      
      "amount_range": {
        "min_amount": "100.00",
        "max_amount": "500.00",
        "currency": "USD"
      },
      
      "approval_config": {
        "approvers": [
          {"role": "manager", "order": 1},
          {"role": "admin", "order": 2}
        ],
        "min_percentage_required": 100,
        "specific_approver": null,
        "is_hybrid_rule": false
      },
      
      "conditions": {
        "categories": ["Meals", "Travel", "Office Supplies"],
        "departments": []
      },
      
      "metadata": {
        "created_at": "2025-10-04T10:30:00Z",
        "updated_at": "2025-10-04T14:25:00Z",
        "created_by": {
          "id": "admin-123",
          "name": "Admin User"
        }
      },
      
      "usage_stats": {
        "total_expenses_processed": 45,
        "avg_approval_time": "2.3 hours",
        "approval_success_rate": 92.5
      }
    }
  ],
  "total_count": 5,
  "filters_applied": {
    "show_inactive": false,
    "category_filter": null,
    "amount_range": {
      "min_amount": null,
      "max_amount": null
    }
  },
  "company": {
    "id": "company-456",
    "name": "TechCorp Solutions"
  }
}
```

---

### **POST /api/approval-rules/management/** - Create or Update Approval Rule

Creates a new approval rule or updates an existing one (upsert functionality by name or ID).

#### **Features:**
- ✅ **Create new rules** - Full configuration with validation
- ✅ **Update existing rules** - Upsert by name or ID
- ✅ **Ordered approver lists** - Sequential approval workflows
- ✅ **Percentage thresholds** - Flexible approval requirements
- ✅ **Specific approver assignment** - VIP approver configuration
- ✅ **Hybrid rule settings** - Complex approval combinations
- ✅ **Priority management** - Rule ordering and precedence

#### **Access Control:**
- **Admins Only:** Only administrators can create or update approval rules

#### **Request Body:**
```json
{
  "name": "High Value Technology Expenses",
  "description": "Complex approval for high-value technology purchases",
  "id": "optional-for-updates",
  
  "amount_range": {
    "min_amount": "1000.00",
    "max_amount": "5000.00"
  },
  
  "approval_config": {
    "approvers": [
      {"role": "manager", "order": 1, "department": "IT"},
      {"role": "manager", "order": 2, "department": "Finance"},
      {"role": "admin", "order": 3}
    ],
    "min_percentage_required": 75,
    "specific_approver_id": "cfo-user-id-optional",
    "is_hybrid_rule": true
  },
  
  "conditions": {
    "categories": ["Technology", "Software", "Hardware"],
    "departments": ["IT", "Engineering"]
  },
  
  "priority": 5,
  "is_active": true
}
```

#### **Field Validation:**
| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| `name` | String | Yes | Unique within company, 1-255 chars |
| `description` | String | No | Max 1000 characters |
| `amount_range.min_amount` | Decimal | No | >= 0, format: "0.00" |
| `amount_range.max_amount` | Decimal | No | >= min_amount |
| `approval_config.approvers` | Array | Yes | Valid roles, user IDs |
| `min_percentage_required` | Integer | No | 1-100, default: 100 |
| `categories` | Array | No | Valid expense categories |
| `priority` | Integer | No | Default: 0 (higher = higher priority) |

#### **Approver Configuration Options:**

##### **1. Role-based Approvers:**
```json
{"role": "manager"}
{"role": "admin"}
```

##### **2. Specific User Approvers:**
```json
{"user_id": "123e4567-e89b-12d3-a456-426614174000"}
```

##### **3. Sequential Approvers (Ordered):**
```json
[
  {"role": "manager", "order": 1},
  {"role": "admin", "order": 2}
]
```

##### **4. Department-specific Approvers:**
```json
{"role": "manager", "department": "Finance"}
```

#### **Response - Rule Created:**
```json
{
  "message": "Approval rule \"High Value Technology Expenses\" created successfully",
  "approval_rule": {
    "id": "new-rule-id-123",
    "name": "High Value Technology Expenses",
    "description": "Complex approval for high-value technology purchases",
    "priority": 5,
    "is_active": true,
    
    "amount_range": {
      "min_amount": "1000.00",
      "max_amount": "5000.00"
    },
    
    "approval_config": {
      "approvers": [
        {"role": "manager", "order": 1, "department": "IT"},
        {"role": "manager", "order": 2, "department": "Finance"},
        {"role": "admin", "order": 3}
      ],
      "min_percentage_required": 75,
      "specific_approver": null,
      "is_hybrid_rule": true
    },
    
    "conditions": {
      "categories": ["Technology", "Software", "Hardware"],
      "departments": ["IT", "Engineering"]
    },
    
    "created_at": "2025-10-04T15:30:00Z",
    "updated_at": "2025-10-04T15:30:00Z"
  },
  "action": "created",
  "created": true
}
```

#### **Response - Rule Updated:**
```json
{
  "message": "Approval rule \"High Value Technology Expenses\" updated successfully",
  "approval_rule": { /* same structure */ },
  "action": "updated",
  "created": false
}
```

---

### **GET /api/approval-rules/management/{rule_id}/** - Get Rule Details

Retrieves detailed information about a specific approval rule including usage statistics.

#### **Features:**
- ✅ **Complete rule configuration** - All settings and metadata
- ✅ **Usage statistics** - Performance and utilization metrics
- ✅ **Approval history summary** - Recent activity overview
- ✅ **Related rules analysis** - Overlapping and conflicting rules

#### **Access Control:**
- **Managers & Admins:** Can view rule details

#### **Response:**
```json
{
  "approval_rule": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "High Value Technology Expenses",
    "description": "Complex approval for high-value technology purchases",
    "priority": 5,
    "is_active": true,
    
    "amount_range": {
      "min_amount": "1000.00", 
      "max_amount": "5000.00",
      "currency": "USD"
    },
    
    "approval_config": {
      "approvers": [
        {
          "role": "manager",
          "order": 1,
          "department": "IT",
          "user_id": null
        },
        {
          "role": "admin", 
          "order": 2,
          "user_id": "admin-123",
          "user_name": "Admin User",
          "user_email": "admin@techcorp.com"
        }
      ],
      "min_percentage_required": 75,
      "specific_approver": null,
      "is_hybrid_rule": true
    },
    
    "conditions": {
      "categories": ["Technology", "Software", "Hardware"],
      "departments": ["IT", "Engineering"] 
    },
    
    "metadata": {
      "created_at": "2025-10-04T15:30:00Z",
      "updated_at": "2025-10-04T15:45:00Z",
      "created_by": {
        "id": "admin-456",
        "name": "Admin User",
        "email": "admin@techcorp.com"
      }
    },
    
    "usage_statistics": {
      "total_expenses_processed": 127,
      "expenses_approved": 98,
      "expenses_rejected": 15,
      "expenses_pending": 14,
      "avg_approval_time_hours": 4.2,
      "current_pending_count": 3,
      "last_used": "2025-10-04T12:30:00Z",
      "approval_success_rate": 87.4
    }
  }
}
```

---

### **PUT /api/approval-rules/management/{rule_id}/** - Update Specific Rule

Updates a specific approval rule with new configuration.

#### **Features:**
- ✅ **Targeted updates** - Update specific rule by ID
- ✅ **Partial updates** - Only send changed fields
- ✅ **Validation** - Same validation as create endpoint
- ✅ **Version tracking** - Maintains update history

#### **Access Control:**
- **Admins Only:** Only administrators can update rules

#### **Request Body:** (Same format as POST, but all fields optional except `name`)

#### **Response:** (Same format as POST with `"action": "updated"`)

---

### **DELETE /api/approval-rules/management/{rule_id}/** - Soft Delete Rule

Deactivates an approval rule (soft delete) rather than permanently removing it.

#### **Features:**
- ✅ **Soft delete** - Sets `is_active: false` instead of removing
- ✅ **Data preservation** - Maintains rule history and relationships
- ✅ **Audit trail** - Tracks who deactivated the rule and when

#### **Access Control:**
- **Admins Only:** Only administrators can delete rules

#### **Response:**
```json
{
  "message": "Approval rule \"High Value Technology Expenses\" deactivated successfully",
  "approval_rule": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "High Value Technology Expenses",
    "is_active": false
  }
}
```

---

## 🔄 Advanced Operations

### **POST /api/approval-rules/bulk/** - Bulk Operations

Performs bulk operations on multiple approval rules for efficient management.

#### **Supported Operations:**

#### **1. Bulk Priority Reordering:**
```json
{
  "operation": "reorder_priorities",
  "rule_priorities": [
    {"rule_id": "rule-1", "priority": 10},
    {"rule_id": "rule-2", "priority": 20},
    {"rule_id": "rule-3", "priority": 30}
  ]
}
```

#### **2. Bulk Status Toggle:**
```json
{
  "operation": "bulk_toggle_status",
  "rule_ids": [
    "rule-1", 
    "rule-2", 
    "rule-3"
  ],
  "is_active": false
}
```

#### **Response:**
```json
{
  "message": "Updated priorities for 3 approval rules",
  "updated_rules": [
    {
      "id": "rule-1",
      "name": "Small Expenses",
      "priority": 10
    },
    {
      "id": "rule-2", 
      "name": "Medium Expenses",
      "priority": 20
    }
  ]
}
```

---

### **POST /api/approval-rules/validate/** - Rule Validation

Validates approval rule configuration before creating or updating to catch errors early.

#### **Features:**
- ✅ **Configuration validation** - Checks all field formats and constraints
- ✅ **Business logic validation** - Validates rule conflicts and overlaps
- ✅ **Performance warnings** - Suggests optimizations
- ✅ **Best practices** - Recommends improvements

#### **Request Body:** (Same format as create rule)

#### **Response:**
```json
{
  "is_valid": true,
  "errors": [],
  "warnings": [
    "Amount range overlaps with rule \"Medium Value Expenses\" ($100.00 - $500.00)"
  ],
  "suggestions": [
    "Consider reducing the number of approvers for better performance",
    "Low percentage requirement with many approvers may lead to quick approvals"
  ]
}
```

#### **Validation Categories:**

##### **🚨 Errors (prevent creation):**
- Invalid field formats
- Missing required fields
- Rule name conflicts
- Invalid approver configurations
- Impossible constraints

##### **⚠️ Warnings (allow but notify):**
- Amount range overlaps
- Conflicting rule priorities
- Duplicate approver assignments
- Inactive approver references

##### **💡 Suggestions (optimization):**
- Performance improvements
- Best practice recommendations
- Configuration optimizations
- Business logic enhancements

---

## 🔧 Advanced Rule Configuration

### **Hybrid Rules (Complex Approval Logic):**

Hybrid rules combine multiple approval strategies for complex business requirements:

```json
{
  "name": "Complex Executive Approval",
  "approval_config": {
    "is_hybrid_rule": true,
    "approvers": [
      {"role": "manager", "department": "Finance"},
      {"role": "manager", "department": "Operations"}
    ],
    "min_percentage_required": 50,
    "specific_approver_id": "cfo-user-id"
  }
}
```

**Logic:** Either the CFO can auto-approve, OR 50% of Finance/Operations managers must approve.

### **Sequential Approval Chains:**

Define exact approval order for structured workflows:

```json
{
  "approval_config": {
    "approvers": [
      {"role": "manager", "order": 1, "department": "Requesting"},
      {"role": "manager", "order": 2, "department": "Finance"},
      {"role": "admin", "order": 3},
      {"user_id": "cfo-id", "order": 4}
    ],
    "min_percentage_required": 100
  }
}
```

**Logic:** Must be approved in exact order: Dept Manager → Finance Manager → Admin → CFO

### **Department-Scoped Rules:**

Create rules that apply to specific departments:

```json
{
  "conditions": {
    "categories": ["Technology", "Software"],
    "departments": ["IT", "Engineering", "Data Science"]
  }
}
```

### **Amount Range Strategies:**

#### **1. Tiered Approval (Multiple Rules):**
- Rule 1: $0-$100 → Any Manager
- Rule 2: $100-$1000 → Manager + Admin
- Rule 3: $1000+ → Manager + Admin + CFO

#### **2. Percentage-Based by Amount:**
- Small ($0-$500): 100% of 1 manager
- Medium ($500-$2000): 75% of managers
- Large ($2000+): 60% of all senior staff

---

## 🧪 Testing the API

### **Setup Test Environment:**
```bash
# 1. Start Django server
python manage.py runserver 127.0.0.1:8001

# 2. Create sample approval rules (if needed)
python manage.py create_approval_rules --company-name "TechCorp Solutions"

# 3. Run comprehensive API tests
python test_approval_rule_api.py
```

### **Manual Testing Examples:**

#### **Create a New Rule:**
```bash
curl -X POST http://127.0.0.1:8001/api/approval-rules/management/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Rule",
    "description": "Created via API testing", 
    "amount_range": {
      "min_amount": "250.00",
      "max_amount": "750.00"
    },
    "approval_config": {
      "approvers": [
        {"role": "manager"},
        {"role": "admin"}
      ],
      "min_percentage_required": 75
    },
    "conditions": {
      "categories": ["Travel", "Meals"]
    },
    "priority": 3,
    "is_active": true
  }'
```

#### **List All Rules with Filters:**
```bash
curl -X GET "http://127.0.0.1:8001/api/approval-rules/management/?category=Travel&min_amount=100" \
  -H "Authorization: Token YOUR_TOKEN"
```

#### **Update Rule Priority (Bulk):**
```bash
curl -X POST http://127.0.0.1:8001/api/approval-rules/bulk/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "reorder_priorities",
    "rule_priorities": [
      {"rule_id": "RULE_ID_1", "priority": 1},
      {"rule_id": "RULE_ID_2", "priority": 2}
    ]
  }'
```

#### **Validate Rule Configuration:**
```bash
curl -X POST http://127.0.0.1:8001/api/approval-rules/validate/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Validation Test",
    "amount_range": {"min_amount": "1000", "max_amount": "500"},
    "approval_config": {
      "approvers": [{"role": "invalid_role"}],
      "min_percentage_required": 150
    }
  }'
```

---

## 🔒 Security & Authorization

### **Role-Based Access Control:**

| Operation | Employee | Manager | Admin |
|-----------|----------|---------|-------|
| View rules | ❌ | ✅ (read-only) | ✅ |
| Create rules | ❌ | ❌ | ✅ |
| Update rules | ❌ | ❌ | ✅ |
| Delete rules | ❌ | ❌ | ✅ |
| Bulk operations | ❌ | ❌ | ✅ |
| Validate rules | ❌ | ✅ | ✅ |

### **Data Isolation:**
- ✅ **Company-scoped** - Users can only access their company's rules
- ✅ **Audit trail** - All changes tracked with user and timestamp
- ✅ **Soft deletes** - Rules deactivated instead of deleted for audit purposes
- ✅ **Version control** - Change tracking for compliance

### **Input Validation:**
- ✅ **SQL injection prevention** - Parameterized queries
- ✅ **XSS protection** - Input sanitization
- ✅ **Business logic validation** - Rule consistency checks
- ✅ **Rate limiting** - API endpoint protection

---

## 📊 API Usage Patterns

### **Common Workflows:**

#### **1. Initial Setup:**
1. Create base approval rules for different amount tiers
2. Configure department-specific rules
3. Set up special approver assignments
4. Test with validation endpoint

#### **2. Ongoing Management:**
1. Monitor rule usage statistics
2. Adjust priorities based on business needs
3. Update approver lists as staff changes
4. Bulk reorder rules for optimization

#### **3. Seasonal Adjustments:**
1. Temporarily adjust approval thresholds
2. Add special rules for budget periods
3. Update categories for new expense types
4. Bulk toggle rules for different periods

---

## 🚀 Integration & Best Practices

### **Frontend Integration:**
- Use validation endpoint before showing create/edit forms
- Implement real-time rule conflict detection
- Show usage statistics for rule optimization
- Provide bulk operations for administrative efficiency

### **Performance Optimization:**
- Cache frequently accessed rules
- Use pagination for large rule lists
- Implement rule priority indexing
- Monitor API response times

### **Business Logic Recommendations:**
- Keep rule counts manageable (< 20 active rules)
- Use clear, descriptive rule names
- Avoid excessive rule overlaps
- Regular review and cleanup of unused rules

---

## 🎯 Error Handling

### **HTTP Status Codes:**
- `200 OK` - Successful operation
- `201 Created` - Rule created successfully
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Rule not found
- `500 Internal Server Error` - Server error

### **Error Response Format:**
```json
{
  "error": "Detailed error message explaining the issue",
  "field_errors": {
    "field_name": ["Specific validation error for this field"]
  },
  "error_code": "RULE_NAME_DUPLICATE"
}
```

---

Your **Approval Rule Configuration API** is now complete with comprehensive CRUD operations, advanced rule configuration, bulk operations, validation, and extensive documentation! 🎉

This system provides enterprise-grade approval rule management with the flexibility to handle any business approval workflow requirement while maintaining security, performance, and usability.