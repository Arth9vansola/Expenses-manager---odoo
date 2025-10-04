# Step 12: Expense Submission API Documentation

## 🎯 Overview

This document describes the comprehensive expense submission API with OCR processing, receipt upload, and role-based expense management.

## 🔧 Base Configuration

**Base URL:** `http://127.0.0.1:8000/api`  
**Authentication:** Token-based (include `Authorization: Token <your-token>` in headers)

---

## 📤 Expense Submission API

### **POST /api/expenses/submit/** - Submit Expense with OCR

Creates a new expense with optional receipt image processing and automatic field extraction.

#### **Features:**
- ✅ **Receipt Image Upload** - Supports JPG, PNG formats (up to 10MB)
- ✅ **OCR Processing** - Tesseract OCR with fallback to mock data
- ✅ **Auto-Field Extraction** - Amount, date, merchant, category detection
- ✅ **Manual Override** - User can override OCR-extracted fields
- ✅ **Role-based Creation** - Admins/Managers can create expenses for others
- ✅ **Approval Rule Linking** - Automatically links to company approval workflows

#### **Request Format:**

**Content-Type:** `multipart/form-data` (for receipt upload) or `application/json`

#### **Form Data Fields:**

```json
{
  "owner_id": "uuid (optional)", 
  "amount": "decimal (optional)",
  "currency": "string (optional)",
  "category": "string (optional)", 
  "description": "string (optional)",
  "date": "YYYY-MM-DD (optional)",
  "receipt": "file (optional)",
  "auto_extract": "boolean (default: true)",
  "override_ocr": "boolean (default: false)"
}
```

#### **Field Details:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `owner_id` | UUID | No | User ID (admin/manager only - creates expense for another user) |
| `amount` | Decimal | No | Expense amount (auto-extracted from receipt if not provided) |
| `currency` | String | No | 3-letter currency code (defaults to company currency) |
| `category` | String | No | Expense category (auto-classified from receipt content) |
| `description` | String | No | Expense description (auto-generated from merchant name) |
| `date` | Date | No | Expense date (extracted from receipt or defaults to today) |
| `receipt` | File | No | Receipt image file (JPG/PNG, max 10MB) |
| `auto_extract` | Boolean | No | Enable OCR processing (default: true) |
| `override_ocr` | Boolean | No | User input overrides OCR data (default: false) |

#### **Supported Categories:**
- Travel, Meals, Office Supplies, Transportation
- Entertainment, Healthcare, Technology, Other

#### **Supported Currencies:**
- USD, EUR, GBP, JPY, CAD, AUD, INR, CNY

---

### **Response Examples:**

#### **Successful Submission with OCR:**
```json
{
  "message": "Expense created successfully",
  "expense": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "owner": "456e7890-e12b-34d5-a678-901234567890",
    "owner_name": "John Doe",
    "amount": "44.23",
    "currency": "USD",
    "category": "Meals",
    "description": "Expense at GOURMET BISTRO",
    "date": "2025-10-04",
    "status": "draft",
    "receipt": "/media/receipts/123e4567_a1b2c3d4.jpg",
    "created_at": "2025-10-04T14:30:00Z",
    "metadata": {
      "ocr_processed": true,
      "ocr_confidence": 0.85,
      "ocr_method": "tesseract",
      "requires_approval": true,
      "approval_rule_id": "789e0123-e45f-67g8-h901-234567890123"
    }
  },
  "ocr_results": {
    "extracted_data": {
      "amount": 44.23,
      "date": "2025-10-04",
      "merchant": "GOURMET BISTRO", 
      "category": "Meals",
      "currency": "USD"
    },
    "confidence": 0.85,
    "processing_method": "tesseract"
  }
}
```

#### **Manual Submission (no receipt):**
```json
{
  "message": "Expense created successfully",
  "expense": {
    "id": "456e7890-e12b-34d5-a678-901234567890",
    "owner": "123e4567-e89b-12d3-a456-426614174000",
    "owner_name": "Jane Smith",
    "amount": "25.50", 
    "currency": "USD",
    "category": "Transportation",
    "description": "Taxi to client meeting",
    "date": "2025-10-04",
    "status": "draft",
    "receipt": null,
    "created_at": "2025-10-04T15:00:00Z",
    "metadata": {
      "ocr_processed": false,
      "requires_approval": false
    }
  }
}
```

---

## 📋 Expense Viewing APIs

### **GET /api/expenses/list/** - List All Expenses (Role-based)

Retrieves expenses based on user role with filtering and pagination.

#### **Access Control:**
- **Employee:** Only their own expenses
- **Manager:** Their expenses + subordinates' expenses  
- **Admin:** All company expenses

#### **Query Parameters:**
```
?category=Meals&status=draft&date_from=2025-10-01&date_to=2025-10-31&page=1&page_size=20
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | String | Filter by expense category |
| `status` | String | Filter by status (draft, pending, approved, rejected) |
| `date_from` | Date | Start date filter (YYYY-MM-DD) |
| `date_to` | Date | End date filter (YYYY-MM-DD) |
| `page` | Integer | Page number (default: 1) |
| `page_size` | Integer | Items per page (max: 100, default: 20) |

#### **Response:**
```json
{
  "expenses": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "owner_name": "John Doe", 
      "amount": "44.23",
      "currency": "USD",
      "category": "Meals",
      "description": "Business lunch",
      "date": "2025-10-04",
      "status": "draft",
      "created_at": "2025-10-04T14:30:00Z"
    }
  ],
  "pagination": {
    "total_count": 25,
    "page": 1,
    "page_size": 20,
    "total_pages": 2
  },
  "filters_applied": {
    "category": "Meals",
    "status": "draft", 
    "date_from": "2025-10-01",
    "date_to": "2025-10-31"
  }
}
```

---

### **GET /api/expenses/{user_id}/** - User-Specific Expenses

Retrieves expenses for a specific user (with permission checks).

#### **Access Control:**
- **Users can view:** Their own expenses
- **Managers can view:** Their subordinates' expenses
- **Admins can view:** Any user's expenses in their company

#### **URL Parameters:**
- `user_id`: UUID of the target user

#### **Query Parameters:**
Same filtering options as list endpoint (category, status).

#### **Response:**
```json
{
  "user": {
    "id": "456e7890-e12b-34d5-a678-901234567890",
    "name": "John Doe",
    "email": "john.doe@company.com", 
    "role": "employee"
  },
  "expenses": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "amount": "44.23",
      "currency": "USD",
      "category": "Meals",
      "description": "Business lunch",
      "date": "2025-10-04", 
      "status": "draft",
      "receipt": "/media/receipts/123e4567_a1b2c3d4.jpg"
    }
  ],
  "total_count": 15
}
```

---

### **GET /api/expenses/my/** - Current User's Expenses

Convenient endpoint to get the current user's expenses without specifying user ID.

Same response format as user-specific endpoint.

---

## 🤖 OCR Processing Details

### **OCR Service Features:**

#### **Text Extraction:**
- **Primary:** Tesseract OCR with image preprocessing
- **Fallback:** Mock data generation for testing
- **Preprocessing:** Denoising, grayscale conversion, threshold optimization

#### **Field Extraction:**

**Amount Detection:**
```regex
- total[:\s]*\$?([0-9]+\.?[0-9]{0,2})  # Total: $XX.XX
- \$([0-9]+\.?[0-9]{0,2})              # $XX.XX format
- ([0-9]{1,4}\.[0-9]{2})               # Generic XX.XX
```

**Date Extraction:**
```regex
- (\d{4}-\d{2}-\d{2})     # YYYY-MM-DD
- (\d{2}/\d{2}/\d{4})     # MM/DD/YYYY
- date[:\s]*(\d{2}/\d{2}/\d{4})  # Date: MM/DD/YYYY
```

**Merchant Detection:**
- First few lines of receipt text
- Business name patterns (all caps, proper case)
- Excludes address-like content

**Category Classification:**
```javascript
Categories: {
  'Travel': ['uber', 'airline', 'hotel', 'booking'],
  'Meals': ['restaurant', 'cafe', 'food', 'starbucks'],
  'Transportation': ['gas', 'fuel', 'parking', 'metro'],
  'Office Supplies': ['staples', 'amazon', 'supplies']
}
```

#### **Currency Detection:**
Supports symbols: $, €, £, ¥, ₹, C$, A$

---

## 🔒 Security & Validation

### **File Upload Security:**
- ✅ **File Type Validation** - Only JPG, PNG images allowed
- ✅ **Size Limits** - 10MB maximum file size
- ✅ **Secure Storage** - Files stored in protected media directory
- ✅ **Unique Filenames** - UUID-based naming prevents conflicts

### **Data Validation:**
- ✅ **Amount Range** - 0.01 to 10,000 reasonable expense range
- ✅ **Currency Validation** - Only supported currency codes
- ✅ **Category Validation** - Predefined expense categories
- ✅ **Role Permissions** - Users can only create expenses they're authorized for

### **OCR Security:**
- ✅ **Text Sanitization** - OCR text truncated and sanitized
- ✅ **Error Handling** - Graceful fallback when OCR fails
- ✅ **Temporary Files** - OCR processing files cleaned up after use

---

## 🧪 API Testing

### **Using cURL:**

#### **Submit Expense with Receipt:**
```bash
curl -X POST http://127.0.0.1:8000/api/expenses/submit/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "receipt=@receipt.jpg" \
  -F "category=Meals" \
  -F "description=Business lunch" \
  -F "auto_extract=true"
```

#### **Manual Expense Submission:**
```bash
curl -X POST http://127.0.0.1:8000/api/expenses/submit/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "25.50",
    "currency": "USD", 
    "category": "Transportation",
    "description": "Taxi fare",
    "date": "2025-10-04"
  }'
```

#### **List Expenses with Filters:**
```bash
curl -X GET "http://127.0.0.1:8000/api/expenses/list/?category=Meals&status=draft&page_size=10" \
  -H "Authorization: Token YOUR_TOKEN"
```

#### **Get User Expenses:**
```bash
curl -X GET http://127.0.0.1:8000/api/expenses/my/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### **Using Test Script:**
```bash
cd expense-backend
python test_expense_api.py
```

---

## 📊 Workflow Integration

### **Expense Lifecycle:**
1. **Submission** → Status: `draft`
2. **OCR Processing** → Auto-field extraction
3. **Rule Linking** → Approval requirements determined
4. **Review** → Manager/Admin review (next step)
5. **Approval/Rejection** → Final status

### **Approval Rule Linking:**
- Expenses automatically linked to approval rules based on:
  - Amount thresholds (min_amount, max_amount)
  - Category matching
  - Company-specific rules
- Metadata tracks approval requirements

---

## 🚀 Performance Features

### **Optimization:**
- ✅ **Async OCR Processing** - Non-blocking receipt processing
- ✅ **Image Preprocessing** - Optimized for OCR accuracy
- ✅ **Efficient Queries** - Role-based query optimization
- ✅ **Pagination** - Large datasets handled efficiently
- ✅ **Caching** - Static data cached for performance

### **Monitoring:**
- ✅ **Logging** - Comprehensive error and activity logging
- ✅ **OCR Confidence** - Processing confidence scores tracked
- ✅ **Processing Method** - Tesseract vs mock data tracking
- ✅ **Error Handling** - Graceful degradation on failures

---

## 🎯 Next Steps

1. **Frontend Integration** - Connect React components to expense APIs
2. **Approval Workflow** - Implement expense approval endpoints  
3. **Advanced OCR** - Google Vision API integration
4. **Bulk Operations** - Multi-expense submission
5. **Reporting** - Expense analytics and reporting
6. **Mobile Support** - Camera capture for receipts

Your expense submission system is now complete with OCR processing, role-based access, and comprehensive API endpoints! 🎉