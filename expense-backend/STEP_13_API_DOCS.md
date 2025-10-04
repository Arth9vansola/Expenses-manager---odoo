# Step 13: Approval Workflow API & Rule Engine Documentation

## 🎯 Overview

This document describes the comprehensive approval workflow system with rule-based processing, sequential approvals, percentage thresholds, special approver logic, and complete approval history tracking.

## 🔧 Base Configuration

**Base URL:** `http://127.0.0.1:8001/api`  
**Authentication:** Token-based (include `Authorization: Token <your-token>` in headers)

---

## 🔄 Approval Workflow Endpoints

### **GET /api/approvals/{approver_id}/** - Get Pending Approvals

Retrieves all expenses pending approval for a specific approver with intelligent filtering and contextual information.

#### **Features:**
- ✅ **Role-based filtering** - Only shows expenses user can approve
- ✅ **Approval context** - Shows user's position in approval chain
- ✅ **Smart summaries** - Total amounts, categories, high-value counts
- ✅ **Workflow status** - Current step and next actions

#### **Access Control:**
- **Users:** Can view their own pending approvals
- **Managers:** Can view subordinates' pending approvals
- **Admins:** Can view any approver's pending list in company

#### **Response Example:**
```json
{
  "approver": {
    "id": "456e7890-e12b-34d5-a678-901234567890",
    "name": "Manager One",
    "email": "manager1@techcorp.com",
    "role": "manager"
  },
  "pending_expenses": [
    {
      "expense_id": "123e4567-e89b-12d3-a456-426614174000",
      "owner": {
        "id": "789e0123-e45f-67g8-h901-234567890123",
        "name": "John Doe",
        "email": "john@techcorp.com"
      },
      "amount": "450.00",
      "currency": "USD",
      "category": "Meals",
      "description": "Business lunch with client",
      "date": "2025-10-04",
      "status": "pending",
      "receipt_url": "/media/receipts/123e4567_a1b2c3d4.jpg",
      "created_at": "2025-10-04T10:30:00Z",
      "approval_context": {
        "requires_approval": true,
        "approval_rule": {
          "id": "rule-456",
          "name": "Medium Value Expenses",
          "strategy": "sequential"
        },
        "approver_level": 1,
        "existing_approvals_count": 0,
        "is_final_approver": false
      },
      "approval_history": []
    }
  ],
  "total_count": 1,
  "summary": {
    "total_amount": "450.00",
    "categories": {
      "Meals": 1
    },
    "oldest_expense": "2025-10-04",
    "high_value_count": 0
  }
}
```

---

### **POST /api/approvals/{expense_id}/review/** - Review Expense

Processes approval decisions (approve/reject) with intelligent workflow progression and rule-based logic.

#### **Features:**
- ✅ **Sequential progression** - Moves to next approver in chain
- ✅ **Percentage thresholds** - Tracks approval percentages
- ✅ **Special approver logic** - CFO/admin auto-approval
- ✅ **Complete audit trail** - All decisions tracked with metadata
- ✅ **Smart notifications** - Returns next action requirements

#### **Request Body:**
```json
{
  "approver_id": "456e7890-e12b-34d5-a678-901234567890",
  "action": "approve",
  "comment": "Approved - legitimate business expense with proper documentation"
}
```

#### **Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `approver_id` | UUID | Yes | ID of user making the approval decision |
| `action` | String | Yes | "approve" or "reject" |
| `comment` | String | No | Optional comment explaining the decision |

#### **Response Examples:**

#### **Sequential Approval (More Steps Needed):**
```json
{
  "message": "Expense approved successfully",
  "expense": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending",
    "amount": "450.00",
    "owner_name": "John Doe"
  },
  "review_result": {
    "action": "approved_pending_next",
    "expense_status": "pending",
    "message": "Approved by Manager One. Awaiting approval from Admin User",
    "next_approver": {
      "id": "admin-789",
      "name": "Admin User",
      "role": "admin"
    },
    "approvals_count": 1,
    "total_required": 2
  },
  "approval_history": [
    {
      "id": "approval-123",
      "approver": {
        "name": "Manager One",
        "role": "manager"
      },
      "status": "approved",
      "comment": "Approved - legitimate business expense",
      "created_at": "2025-10-04T14:30:00Z",
      "metadata": {
        "approval_level": 1,
        "approval_method": "sequential"
      }
    }
  ]
}
```

#### **Final Approval (Completed):**
```json
{
  "message": "Expense approved successfully",
  "expense": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "approved",
    "amount": "450.00",
    "owner_name": "John Doe"
  },
  "review_result": {
    "action": "fully_approved",
    "expense_status": "approved",
    "message": "Expense fully approved by Admin User",
    "approved_by": "Admin User",
    "approval_reason": "sequential_complete",
    "next_action": "notify_owner_approved"
  },
  "approval_history": [
    {
      "id": "approval-123",
      "approver": {"name": "Manager One", "role": "manager"},
      "status": "approved",
      "comment": "Approved - legitimate business expense",
      "created_at": "2025-10-04T14:30:00Z"
    },
    {
      "id": "approval-456", 
      "approver": {"name": "Admin User", "role": "admin"},
      "status": "approved",
      "comment": "Final approval - expense processed",
      "created_at": "2025-10-04T14:35:00Z"
    }
  ]
}
```

#### **Rejection Response:**
```json
{
  "message": "Expense rejected successfully",
  "expense": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "rejected",
    "amount": "450.00"
  },
  "review_result": {
    "action": "rejected",
    "expense_status": "rejected",
    "message": "Expense has been rejected",
    "rejected_by": "Manager One",
    "rejection_reason": "Insufficient documentation provided",
    "next_action": "notify_owner"
  }
}
```

---

### **GET /api/expenses/{expense_id}/approval-history/** - Approval History

Retrieves complete approval history and workflow status for a specific expense.

#### **Access Control:**
- **Expense Owner:** Can view their own expense history
- **Approvers:** Can view expenses they've reviewed
- **Managers:** Can view subordinates' expense history
- **Admins:** Can view all company expense history

#### **Response:**
```json
{
  "expense": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "owner": "John Doe",
    "amount": "450.00",
    "currency": "USD",
    "category": "Meals",
    "description": "Business lunch with client",
    "status": "approved",
    "created_at": "2025-10-04T10:30:00Z"
  },
  "approval_history": [
    {
      "id": "approval-123",
      "approver": {
        "id": "manager-456",
        "name": "Manager One",
        "email": "manager1@techcorp.com",
        "role": "manager"
      },
      "status": "approved",
      "comment": "Approved - legitimate business expense",
      "created_at": "2025-10-04T14:30:00Z",
      "metadata": {
        "approval_level": 1,
        "approval_method": "sequential"
      }
    },
    {
      "id": "approval-456",
      "approver": {
        "id": "admin-789",
        "name": "Admin User",
        "role": "admin"
      },
      "status": "approved", 
      "comment": "Final approval - expense processed",
      "created_at": "2025-10-04T14:35:00Z",
      "metadata": {
        "approval_level": 2,
        "approval_method": "sequential"
      }
    }
  ],
  "approval_context": {
    "requires_approval": true,
    "approval_rule": {
      "id": "rule-456",
      "name": "Medium Value Expenses",
      "strategy": "sequential"
    }
  },
  "workflow_status": {
    "status": "completed",
    "result": "approved", 
    "message": "Expense has been fully approved"
  }
}
```

---

### **GET /api/approval-rules/** - Get Approval Rules

Retrieves all approval rules for the company (admin-only access).

#### **Response:**
```json
{
  "approval_rules": [
    {
      "id": "rule-123",
      "name": "Low Value Expenses",
      "min_amount": "0.01",
      "max_amount": "99.99",
      "approval_flow": {
        "strategy": "any_manager",
        "description": "Any manager can approve expenses under $100",
        "approvers": [
          {"role": "manager", "min_level": 2}
        ]
      },
      "conditions": {
        "categories": ["Meals", "Office Supplies", "Transportation"]
      },
      "is_active": true,
      "created_at": "2025-10-04T09:00:00Z"
    },
    {
      "id": "rule-456",
      "name": "Medium Value Expenses", 
      "min_amount": "100.00",
      "max_amount": "500.00",
      "approval_flow": {
        "strategy": "sequential",
        "description": "Manager first, then admin",
        "approvers": [
          {"role": "manager"},
          {"role": "admin"}
        ]
      },
      "conditions": {
        "categories": ["Meals", "Travel", "Office Supplies"]
      },
      "is_active": true,
      "created_at": "2025-10-04T09:01:00Z"
    }
  ],
  "total_count": 2
}
```

---

## 🤖 Approval Rule Engine

### **Supported Approval Strategies:**

#### **1. Sequential Approval (`"strategy": "sequential"`)**
Expenses must be approved by specific users in order.

```json
{
  "strategy": "sequential",
  "approvers": [
    {"role": "manager"},
    {"role": "admin"}
  ]
}
```

**Logic:** Each approver in the chain must approve before moving to the next.

#### **2. Percentage Approval (`"strategy": "percentage"`)**
A percentage of eligible approvers must approve.

```json
{
  "strategy": "percentage", 
  "percentage_required": 60,
  "eligible_approvers": [
    {"role": "manager"},
    {"role": "admin"}
  ]
}
```

**Logic:** If 60% of managers/admins approve, expense is approved.

#### **3. Special Approver (`"strategy": "special_approver"`)**
Certain roles can auto-approve, or fall back to sequential.

```json
{
  "strategy": "special_approver",
  "special_approvers": [
    {"role": "admin", "auto_approve": true}
  ],
  "approvers": [
    {"role": "manager"},
    {"role": "admin"}
  ]
}
```

**Logic:** If admin approves, auto-approve. Otherwise, use sequential flow.

#### **4. Any Manager (`"strategy": "any_manager"`)**
Any manager or admin can approve.

```json
{
  "strategy": "any_manager",
  "approvers": [
    {"role": "manager", "min_level": 2}
  ]
}
```

**Logic:** First manager/admin to approve completes the approval.

#### **5. All Managers (`"strategy": "all_managers"`)**
All managers must approve before completion.

```json
{
  "strategy": "all_managers",
  "eligible_approvers": [
    {"role": "manager"}
  ]
}
```

**Logic:** Every manager in the company must approve.

---

### **Rule Matching Logic:**

1. **Amount Range:** `min_amount <= expense.amount <= max_amount`
2. **Category Filter:** Expense category must be in rule's allowed categories
3. **Company Scope:** Rules only apply within same company
4. **Priority Order:** Rules processed by `min_amount` ascending

---

## 🔒 Security & Permissions

### **Approval Authorization:**
- ✅ **Self-approval blocked** - Users cannot approve their own expenses
- ✅ **Company isolation** - Users can only approve within their company
- ✅ **Role-based access** - Rules define who can approve what
- ✅ **Duplicate prevention** - Users cannot approve same expense twice

### **Permission Matrix:**

| Action | Employee | Manager | Admin |
|--------|----------|---------|-------|
| View own pending approvals | ✅ | ✅ | ✅ |
| View others' pending | ❌ | ✅ (subordinates) | ✅ (all) |
| Approve low-value expenses | ❌ | ✅ | ✅ |
| Approve high-value expenses | ❌ | ✅ (if in rule) | ✅ |
| View approval history | ✅ (own) | ✅ (subordinates) | ✅ (all) |
| Manage approval rules | ❌ | ❌ | ✅ |

---

## 🧪 Testing the API

### **Setup Test Environment:**
```bash
# 1. Create approval rules
python manage.py create_approval_rules --company-name "TechCorp Solutions"

# 2. Run comprehensive tests
python test_approval_api.py
```

### **Manual Testing with cURL:**

#### **Get Pending Approvals:**
```bash
curl -X GET http://127.0.0.1:8001/api/approvals/APPROVER_ID/ \
  -H "Authorization: Token YOUR_TOKEN"
```

#### **Approve Expense:**
```bash
curl -X POST http://127.0.0.1:8001/api/approvals/EXPENSE_ID/review/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approver_id": "APPROVER_ID",
    "action": "approve",
    "comment": "Approved - legitimate business expense"
  }'
```

#### **Reject Expense:**
```bash
curl -X POST http://127.0.0.1:8001/api/approvals/EXPENSE_ID/review/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approver_id": "APPROVER_ID", 
    "action": "reject",
    "comment": "Insufficient documentation"
  }'
```

#### **View Approval History:**
```bash
curl -X GET http://127.0.0.1:8001/api/expenses/EXPENSE_ID/approval-history/ \
  -H "Authorization: Token YOUR_TOKEN"
```

---

## 📊 Workflow Examples

### **Example 1: Low-Value Expense ($45)**
1. **Rule Match:** "Low Value Expenses" (any_manager)
2. **Submission:** Employee submits expense
3. **Approval:** Any manager approves → **APPROVED** ✅
4. **Result:** Single approval completes workflow

### **Example 2: Medium-Value Expense ($350)**
1. **Rule Match:** "Medium Value Expenses" (sequential)  
2. **Submission:** Employee submits expense
3. **Step 1:** Manager approves → Status: PENDING
4. **Step 2:** Admin approves → **APPROVED** ✅
5. **Result:** Two-step sequential approval

### **Example 3: High-Value Expense ($1500)**
1. **Rule Match:** "High Value Expenses" (60% approval)
2. **Submission:** Employee submits expense
3. **Approvals:** Need 60% of eligible managers/admins
4. **Progress:** Manager1 ✅, Manager2 ✅ → 67% reached
5. **Result:** Percentage threshold met → **APPROVED** ✅

### **Example 4: Special Approver ($2500)**
1. **Rule Match:** "Very High Value" (special_approver)
2. **Submission:** Employee submits expense  
3. **Option A:** Admin approves → **APPROVED** ✅ (auto-approve)
4. **Option B:** Manager approves → Continue to next step
5. **Result:** Admin bypass OR sequential completion

---

## 🚀 Advanced Features

### **Intelligent Workflow Progression:**
- ✅ **Rule-based routing** - Expenses automatically follow correct approval path
- ✅ **Dynamic approver selection** - Next approver determined by rules
- ✅ **Parallel approval tracking** - Multiple approvers can work simultaneously  
- ✅ **Threshold monitoring** - Percentage and count-based completion
- ✅ **Special case handling** - VIP approvers with override capability

### **Comprehensive Audit Trail:**
- ✅ **Complete history** - Every approval step recorded
- ✅ **Detailed metadata** - Approval method, level, timestamps
- ✅ **Comment tracking** - All approver feedback preserved
- ✅ **Workflow context** - Rule information and decision rationale

### **Performance Optimization:**
- ✅ **Efficient queries** - Role-based filtering at database level
- ✅ **Smart caching** - Approval rules cached for performance
- ✅ **Bulk operations** - Multiple approvals processed efficiently
- ✅ **Real-time updates** - Immediate workflow progression

---

## 🎯 Integration Points

### **Next Steps:**
1. **Frontend Integration** - Connect React components to approval APIs
2. **Notification System** - Email/push notifications for pending approvals
3. **Mobile Support** - Approval actions from mobile devices
4. **Analytics Dashboard** - Approval metrics and bottleneck identification
5. **Advanced Rules** - Time-based rules, delegation, escalation

Your approval workflow system is now complete with sophisticated rule processing, multi-strategy support, and comprehensive audit capabilities! 🎉