# Step 15: Currency & OCR Integrations - API Documentation

## Overview
This document provides comprehensive documentation for Step 15 of the Expense Management System, which implements external API integrations for currency operations and OCR receipt processing. These integrations enable real-time currency exchange rates and automated expense data extraction from receipt images.

## Table of Contents
- [Currency Integration APIs](#currency-integration-apis)
- [OCR Integration APIs](#ocr-integration-apis)
- [Integration Service Status APIs](#integration-service-status-apis)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [External Service Dependencies](#external-service-dependencies)

## Currency Integration APIs

### 1. Get Countries and Currencies

**Endpoint:** `GET /api/currencies/countries/`

**Description:** Retrieve a comprehensive list of all countries with their currency information including currency codes, names, and symbols.

**Authentication:** Required (Token)

**Request:**
```http
GET /api/currencies/countries/
Authorization: Token your_auth_token_here
```

**Response (Success - 200):**
```json
{
    "success": true,
    "data": [
        {
            "country": "United States",
            "currency_name": "United States Dollar",
            "currency_code": "USD",
            "currency_symbol": "$"
        },
        {
            "country": "Germany",
            "currency_name": "Euro",
            "currency_code": "EUR",
            "currency_symbol": "€"
        },
        {
            "country": "United Kingdom",
            "currency_name": "British Pound Sterling",
            "currency_code": "GBP",
            "currency_symbol": "£"
        }
    ],
    "source": "rest_countries_api",
    "total_countries": 195,
    "timestamp": "2024-12-04T10:30:00Z",
    "message": "Retrieved 195 countries with currency information"
}
```

**Data Sources:**
- Primary: REST Countries API (https://restcountries.com/v3.1/all)
- Cache: 24-hour cache for performance
- Fallback: Static data for 17 major countries/currencies

---

### 2. Get Exchange Rate

**Endpoint:** `GET /api/currencies/exchange-rate/`

**Description:** Get real-time exchange rate between two currencies.

**Authentication:** Required (Token)

**Query Parameters:**
- `from` (required): Source currency code (3 characters, e.g., USD)
- `to` (required): Target currency code (3 characters, e.g., EUR)

**Request:**
```http
GET /api/currencies/exchange-rate/?from=USD&to=EUR
Authorization: Token your_auth_token_here
```

**Response (Success - 200):**
```json
{
    "success": true,
    "from_currency": "USD",
    "to_currency": "EUR",
    "exchange_rate": 0.85234,
    "source": "exchange_rate_api",
    "timestamp": "2024-12-04T10:30:00Z",
    "expires_at": "2024-12-04T11:30:00Z",
    "message": "1 USD = 0.85234 EUR"
}
```

**Response (Error - 400):**
```json
{
    "success": false,
    "error": "Missing required parameters",
    "details": "Both 'from' and 'to' currency codes are required"
}
```

**Data Sources:**
- Primary: ExchangeRate API (https://api.exchangerate-api.com/v4/latest)
- Cache: 1-hour cache for performance
- Fallback: Mock exchange rates for common currency pairs

---

### 3. Convert Currency

**Endpoint:** `POST /api/currencies/convert/`

**Description:** Convert an amount from one currency to another using real-time exchange rates.

**Authentication:** Required (Token)

**Request:**
```http
POST /api/currencies/convert/
Authorization: Token your_auth_token_here
Content-Type: application/json

{
    "amount": 100.50,
    "from_currency": "USD",
    "to_currency": "EUR"
}
```

**Response (Success - 200):**
```json
{
    "success": true,
    "original_amount": 100.50,
    "from_currency": "USD",
    "converted_amount": 85.23,
    "to_currency": "EUR",
    "exchange_rate": 0.85234,
    "calculation": "100.50 USD × 0.85234 = 85.23 EUR",
    "source": "exchange_rate_api",
    "timestamp": "2024-12-04T10:30:00Z",
    "message": "Successfully converted 100.50 USD to 85.23 EUR"
}
```

**Validation Rules:**
- `amount`: Must be a positive number
- `from_currency`: Must be exactly 3 characters (ISO 4217 code)
- `to_currency`: Must be exactly 3 characters (ISO 4217 code)

---

### 4. Get Multiple Exchange Rates

**Endpoint:** `GET /api/currencies/exchange-rates/`

**Description:** Get multiple exchange rates from a base currency to multiple target currencies in a single request.

**Authentication:** Required (Token)

**Query Parameters:**
- `base` (optional): Base currency code (default: USD)
- `targets` (required): Comma-separated target currency codes

**Request:**
```http
GET /api/currencies/exchange-rates/?base=USD&targets=EUR,GBP,JPY,CAD
Authorization: Token your_auth_token_here
```

**Response (Success - 200):**
```json
{
    "success": true,
    "base_currency": "USD",
    "rates": {
        "EUR": 0.85234,
        "GBP": 0.73456,
        "JPY": 110.25,
        "CAD": 1.34567
    },
    "source": "exchange_rate_api",
    "timestamp": "2024-12-04T10:30:00Z",
    "requested_currencies": ["EUR", "GBP", "JPY", "CAD"],
    "successful_rates": 4,
    "message": "Retrieved 4 exchange rates for USD"
}
```

---

### 5. Clear Currency Cache

**Endpoint:** `DELETE /api/currencies/cache/`

**Description:** Clear the currency service cache. This endpoint is restricted to admin users only.

**Authentication:** Required (Token + Admin privileges)

**Request:**
```http
DELETE /api/currencies/cache/
Authorization: Token your_admin_token_here
```

**Response (Success - 200):**
```json
{
    "success": true,
    "message": "Currency cache cleared successfully",
    "cleared_keys": ["countries_cache", "exchange_rates_cache"],
    "timestamp": "2024-12-04T10:30:00Z"
}
```

**Response (Error - 403):**
```json
{
    "success": false,
    "error": "Permission denied",
    "details": "Only admin users can clear cache"
}
```

---

## OCR Integration APIs

### 1. Extract Receipt Text

**Endpoint:** `POST /api/ocr/extract-text/`

**Description:** Extract raw text from receipt images using OCR technology. Supports multiple OCR providers with intelligent fallback.

**Authentication:** Required (Token)

**Request:**
```http
POST /api/ocr/extract-text/
Authorization: Token your_auth_token_here
Content-Type: multipart/form-data

# Form data:
receipt_image: [binary image file]
```

**Supported Image Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- TIFF (.tiff)
- WebP (.webp)

**File Size Limit:** 10MB maximum

**Response (Success - 200):**
```json
{
    "success": true,
    "extracted_text": "BELLA VISTA RESTAURANT\\n123 Main Street, Downtown\\nPhone: (555) 123-4567\\n\\nDate: 12/04/2024 Time: 14:30\\nServer: Maria G.\\nTable: 12\\n\\n2x Grilled Chicken Breast    $28.00\\n1x Caesar Salad             $14.50\\n\\nSubtotal:                   $42.50\\nTax (8.75%):               $3.72\\n\\nTOTAL:                     $46.22",
    "ocr_provider": "tesseract",
    "text_length": 245,
    "extraction_timestamp": "2024-12-04T10:30:00Z",
    "processing_time_ms": 1250,
    "file_info": {
        "original_name": "receipt_2024_12_04.jpg",
        "size_bytes": 524288,
        "format": ".jpg"
    },
    "message": "Text extracted successfully from receipt image"
}
```

**OCR Provider Fallback Order:**
1. Tesseract (local processing)
2. Google Vision API (cloud-based, high accuracy)
3. AWS Textract (cloud-based, document analysis)
4. Enhanced mock mode (for development/testing)

---

### 2. Extract Expense Data

**Endpoint:** `POST /api/ocr/extract-expense/`

**Description:** Extract structured expense data from receipt images with intelligent parsing of amounts, dates, merchants, line items, and categorization.

**Authentication:** Required (Token)

**Request:**
```http
POST /api/ocr/extract-expense/
Authorization: Token your_auth_token_here
Content-Type: multipart/form-data

# Form data:
receipt_image: [binary image file]
```

**Response (Success - 200):**
```json
{
    "success": true,
    "confidence": "high",
    "confidence_score": 88,
    "amount": 46.22,
    "currency": "USD",
    "date": "2024-12-04",
    "merchant": "BELLA VISTA RESTAURANT",
    "description": "BELLA VISTA RESTAURANT - $46.22 on 2024-12-04",
    "category": "Meals",
    "line_items": [
        {
            "description": "2x Grilled Chicken Breast",
            "amount": 28.00
        },
        {
            "description": "1x Caesar Salad",
            "amount": 14.50
        }
    ],
    "tax_amount": 3.72,
    "tip_amount": null,
    "subtotal": 42.50,
    "payment_method": "Visa",
    "address": "123 Main Street, Downtown",
    "phone": "(555) 123-4567",
    "ocr_provider": "tesseract",
    "raw_text": "BELLA VISTA RESTAURANT\\n123 Main Street...",
    "extraction_timestamp": "2024-12-04T10:30:00Z",
    "processing_time_ms": 1450,
    "file_info": {
        "original_name": "restaurant_receipt.jpg",
        "size_bytes": 487392,
        "format": ".jpg"
    },
    "user": "john.doe",
    "parsing_details": {
        "amount_sources": ["total: 46.22"],
        "date_sources": ["%m/%d/%Y: 12/04/2024"],
        "merchant_candidates": ["Line 0: BELLA VISTA RESTAURANT (Score: 15)"]
    }
}
```

**Confidence Levels:**
- **High (85-100%)**: Amount, date, merchant, and multiple other fields detected
- **Medium (60-84%)**: Basic information detected (amount, merchant OR date)
- **Low (0-59%)**: Minimal information extracted, manual review recommended

**Supported Categories:**
- Meals (restaurants, cafes, food delivery)
- Transportation (gas, rideshare, parking)
- Office Supplies (office stores, supplies)
- Technology (electronics, software)
- Travel (hotels, flights, accommodation)
- Healthcare (pharmacy, medical)
- Entertainment (movies, concerts, events)
- Other (unclassified expenses)

---

### 3. Get OCR Providers

**Endpoint:** `GET /api/ocr/providers/`

**Description:** Get information about available OCR providers and their current status.

**Authentication:** Required (Token)

**Request:**
```http
GET /api/ocr/providers/
Authorization: Token your_auth_token_here
```

**Response (Success - 200):**
```json
{
    "success": true,
    "available_providers": ["tesseract", "google_vision"],
    "current_provider": "tesseract",
    "mock_mode": false,
    "provider_details": {
        "tesseract": {
            "status": "available",
            "description": "Local Tesseract OCR engine - Best for offline processing"
        },
        "google_vision": {
            "status": "available",
            "description": "Google Cloud Vision API - High accuracy cloud OCR"
        },
        "aws_textract": {
            "status": "unavailable",
            "description": "Amazon Textract - Advanced document analysis"
        }
    },
    "total_providers": 2,
    "message": "Found 2 available OCR provider(s)"
}
```

---

## Integration Service Status APIs

### 1. Get Service Status

**Endpoint:** `GET /api/integrations/status/`

**Description:** Get comprehensive status information for all integration services including currency and OCR services.

**Authentication:** Required (Token)

**Request:**
```http
GET /api/integrations/status/
Authorization: Token your_auth_token_here
```

**Response (Success - 200):**
```json
{
    "success": true,
    "services": {
        "currency_service": {
            "status": "operational",
            "providers": ["rest_countries_api", "exchange_rate_api"],
            "cache_status": "active",
            "fallback_available": true
        },
        "ocr_service": {
            "status": "operational",
            "providers": ["tesseract", "google_vision"],
            "mock_mode": false,
            "current_provider": "tesseract"
        }
    },
    "overall_status": "operational",
    "timestamp": "2024-12-04T10:30:00Z",
    "message": "All integration services are operational"
}
```

**Service Status Values:**
- `operational`: Service fully functional with all providers available
- `degraded`: Service functional but with limited providers or fallback mode
- `unavailable`: Service not functional

---

## Authentication

All API endpoints require authentication using Django Token Authentication.

### How to Authenticate

1. **Include the token in the Authorization header:**
```http
Authorization: Token your_auth_token_here
```

2. **Get your authentication token:**
```http
POST /api/auth/login/
Content-Type: application/json

{
    "username": "your_username",
    "password": "your_password"
}
```

### Token Management

- Tokens are persistent and don't expire automatically
- Admin users can access additional endpoints (cache clearing)
- Include the token in all API requests

---

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters or data
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions (admin required)
- `413 Payload Too Large`: File size exceeds 10MB limit
- `415 Unsupported Media Type`: Invalid image format
- `500 Internal Server Error`: Server-side processing error

### Error Response Format

```json
{
    "success": false,
    "error": "Brief error description",
    "details": "Detailed error information",
    "error_code": "OPTIONAL_ERROR_CODE"
}
```

### Validation Errors

**Invalid Currency Code:**
```json
{
    "success": false,
    "error": "Invalid currency code format",
    "details": "Currency codes must be 3 characters (e.g., USD, EUR)"
}
```

**File Too Large:**
```json
{
    "success": false,
    "error": "File too large",
    "details": "Maximum file size is 10MB. Your file is 12.5MB"
}
```

**Missing Parameters:**
```json
{
    "success": false,
    "error": "Missing required parameters",
    "details": "Both 'from' and 'to' currency codes are required"
}
```

---

## Rate Limiting

### Currency API Limits
- **Countries/Currencies**: No specific limit (cached data)
- **Exchange Rates**: 1000 requests/hour per user
- **Currency Conversion**: 1000 requests/hour per user

### OCR API Limits
- **Text Extraction**: 100 requests/hour per user
- **Expense Extraction**: 100 requests/hour per user
- **File Size**: 10MB maximum per upload

### Exceeding Rate Limits

When rate limits are exceeded, the API returns:
```json
{
    "success": false,
    "error": "Rate limit exceeded",
    "details": "Maximum 100 OCR requests per hour. Reset at 2024-12-04T11:00:00Z",
    "retry_after": 3600
}
```

---

## External Service Dependencies

### Currency Service Dependencies

1. **REST Countries API**
   - URL: https://restcountries.com/v3.1/all
   - Purpose: Country and currency information
   - Fallback: Static data for 17 major countries

2. **ExchangeRate API**
   - URL: https://api.exchangerate-api.com/v4/latest
   - Purpose: Real-time exchange rates
   - Fallback: Mock rates for common currency pairs

### OCR Service Dependencies

1. **Tesseract OCR** (Local)
   - Installation: pip install pytesseract
   - System: Tesseract executable required
   - Fallback: Enhanced mock mode

2. **Google Vision API** (Cloud)
   - Setup: Google Cloud credentials required
   - Environment: GOOGLE_APPLICATION_CREDENTIALS
   - Fallback: Other OCR providers or mock mode

3. **AWS Textract** (Cloud)
   - Setup: AWS credentials required
   - Environment: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   - Fallback: Other OCR providers or mock mode

### Offline Mode Support

Both services support offline operation:

- **Currency Service**: Uses cached data and fallback static currency information
- **OCR Service**: Uses enhanced mock mode with realistic receipt data generation

---

## Testing Examples

### Test Currency Conversion

```bash
# Get exchange rate
curl -X GET "http://localhost:8000/api/currencies/exchange-rate/?from=USD&to=EUR" \
  -H "Authorization: Token your_token_here"

# Convert currency
curl -X POST "http://localhost:8000/api/currencies/convert/" \
  -H "Authorization: Token your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "from_currency": "USD",
    "to_currency": "EUR"
  }'
```

### Test OCR Processing

```bash
# Extract text from receipt
curl -X POST "http://localhost:8000/api/ocr/extract-text/" \
  -H "Authorization: Token your_token_here" \
  -F "receipt_image=@receipt.jpg"

# Extract structured expense data
curl -X POST "http://localhost:8000/api/ocr/extract-expense/" \
  -H "Authorization: Token your_token_here" \
  -F "receipt_image=@restaurant_receipt.png"
```

### Test Service Status

```bash
# Check all integration services
curl -X GET "http://localhost:8000/api/integrations/status/" \
  -H "Authorization: Token your_token_here"

# Check OCR providers
curl -X GET "http://localhost:8000/api/ocr/providers/" \
  -H "Authorization: Token your_token_here"
```

---

## Implementation Notes

### Performance Optimization

1. **Caching Strategy**
   - Countries data: 24-hour cache
   - Exchange rates: 1-hour cache
   - Intelligent cache invalidation

2. **Image Processing**
   - Automatic image preprocessing for better OCR
   - Multiple OCR provider attempts
   - Compressed temporary file handling

3. **Error Recovery**
   - Graceful fallback to cached/mock data
   - Multiple OCR provider retry logic
   - Comprehensive error logging

### Security Considerations

1. **File Upload Security**
   - File type validation
   - File size limits (10MB)
   - Temporary file cleanup
   - No persistent file storage

2. **External API Security**
   - API key management via environment variables
   - Request timeout handling
   - Rate limiting protection

3. **Data Privacy**
   - No persistent storage of uploaded images
   - Truncated raw text in responses
   - User activity logging

---

This completes the comprehensive documentation for Step 15: Currency & OCR Integrations. The system now provides robust external API integrations with intelligent fallback mechanisms and comprehensive error handling.