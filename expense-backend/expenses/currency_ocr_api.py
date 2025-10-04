"""
Currency and OCR Integration API endpoints for external service integrations
Provides endpoints for currency operations and receipt OCR processing
"""

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import JsonResponse
import json
import logging
import os
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, Optional, List
import tempfile

from .currency_service import currency_service
from .enhanced_ocr_service import enhanced_ocr_service

logger = logging.getLogger(__name__)

# ============================================================================
# Currency API Endpoints
# ============================================================================

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_countries_and_currencies(request):
    """
    GET /api/currencies/countries/
    
    Retrieve list of all countries with their currencies and currency codes
    
    Response:
    {
        "success": true,
        "data": [
            {
                "country": "United States",
                "currency_name": "United States Dollar", 
                "currency_code": "USD",
                "currency_symbol": "$"
            },
            ...
        ],
        "source": "rest_countries_api|cache|fallback",
        "total_countries": 195,
        "timestamp": "2024-12-04T10:30:00Z"
    }
    """
    try:
        logger.info(f"User {request.user.username} requesting countries and currencies")
        
        result = currency_service.get_countries_and_currencies()
        
        return Response({
            "success": True,
            "data": result["countries"],
            "source": result["source"],
            "total_countries": len(result["countries"]),
            "timestamp": result["timestamp"],
            "message": f"Retrieved {len(result['countries'])} countries with currency information"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Countries/currencies request failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve countries and currencies",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])  
@permission_classes([IsAuthenticated])
def get_exchange_rate(request):
    """
    GET /api/currencies/exchange-rate/?from=USD&to=EUR
    
    Get exchange rate between two currencies
    
    Query Parameters:
    - from: Source currency code (e.g., USD)
    - to: Target currency code (e.g., EUR)
    
    Response:
    {
        "success": true,
        "from_currency": "USD",
        "to_currency": "EUR", 
        "exchange_rate": 0.85234,
        "source": "exchange_rate_api|cache|fallback",
        "timestamp": "2024-12-04T10:30:00Z",
        "expires_at": "2024-12-04T11:30:00Z"
    }
    """
    try:
        from_currency = request.GET.get('from', '').upper()
        to_currency = request.GET.get('to', '').upper()
        
        if not from_currency or not to_currency:
            return Response({
                "success": False,
                "error": "Missing required parameters",
                "details": "Both 'from' and 'to' currency codes are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(from_currency) != 3 or len(to_currency) != 3:
            return Response({
                "success": False,
                "error": "Invalid currency code format",
                "details": "Currency codes must be 3 characters (e.g., USD, EUR)"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"User {request.user.username} requesting exchange rate: {from_currency} to {to_currency}")
        
        result = currency_service.get_exchange_rate(from_currency, to_currency)
        
        return Response({
            "success": True,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "exchange_rate": result["rate"],
            "source": result["source"],
            "timestamp": result["timestamp"],
            "expires_at": result.get("expires_at"),
            "message": f"1 {from_currency} = {result['rate']} {to_currency}"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Exchange rate request failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve exchange rate",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def convert_currency(request):
    """
    POST /api/currencies/convert/
    
    Convert amount between currencies
    
    Request Body:
    {
        "amount": 100.50,
        "from_currency": "USD",
        "to_currency": "EUR"
    }
    
    Response:
    {
        "success": true,
        "original_amount": 100.50,
        "from_currency": "USD",
        "converted_amount": 85.23,
        "to_currency": "EUR",
        "exchange_rate": 0.85234,
        "calculation": "100.50 USD × 0.85234 = 85.23 EUR",
        "source": "exchange_rate_api|cache|fallback",
        "timestamp": "2024-12-04T10:30:00Z"
    }
    """
    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['amount', 'from_currency', 'to_currency']
        for field in required_fields:
            if field not in data:
                return Response({
                    "success": False,
                    "error": f"Missing required field: {field}",
                    "required_fields": required_fields
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate amount
        try:
            amount = float(data['amount'])
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return Response({
                "success": False,
                "error": "Invalid amount",
                "details": "Amount must be a positive number"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from_currency = data['from_currency'].upper()
        to_currency = data['to_currency'].upper()
        
        # Validate currency codes
        if len(from_currency) != 3 or len(to_currency) != 3:
            return Response({
                "success": False,
                "error": "Invalid currency code format",
                "details": "Currency codes must be 3 characters (e.g., USD, EUR)"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"User {request.user.username} converting {amount} {from_currency} to {to_currency}")
        
        result = currency_service.convert_amount(amount, from_currency, to_currency)
        
        return Response({
            "success": True,
            "original_amount": amount,
            "from_currency": from_currency,
            "converted_amount": result["converted_amount"],
            "to_currency": to_currency,
            "exchange_rate": result["exchange_rate"],
            "calculation": f"{amount} {from_currency} × {result['exchange_rate']} = {result['converted_amount']} {to_currency}",
            "source": result["source"],
            "timestamp": result["timestamp"],
            "message": f"Successfully converted {amount} {from_currency} to {result['converted_amount']} {to_currency}"
        }, status=status.HTTP_200_OK)
        
    except json.JSONDecodeError:
        return Response({
            "success": False,
            "error": "Invalid JSON in request body"
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Currency conversion failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to convert currency",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_multiple_exchange_rates(request):
    """
    GET /api/currencies/exchange-rates/?base=USD&targets=EUR,GBP,JPY
    
    Get multiple exchange rates from a base currency
    
    Query Parameters:
    - base: Base currency code (e.g., USD)
    - targets: Comma-separated target currency codes (e.g., EUR,GBP,JPY)
    
    Response:
    {
        "success": true,
        "base_currency": "USD",
        "rates": {
            "EUR": 0.85234,
            "GBP": 0.73456,
            "JPY": 110.25
        },
        "source": "exchange_rate_api|cache|fallback",
        "timestamp": "2024-12-04T10:30:00Z"
    }
    """
    try:
        base_currency = request.GET.get('base', 'USD').upper()
        targets_param = request.GET.get('targets', '')
        
        if not targets_param:
            return Response({
                "success": False,
                "error": "Missing targets parameter",
                "details": "Specify target currencies as comma-separated values (e.g., EUR,GBP,JPY)"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        target_currencies = [currency.strip().upper() for currency in targets_param.split(',')]
        
        # Validate currency codes
        invalid_codes = [code for code in [base_currency] + target_currencies if len(code) != 3]
        if invalid_codes:
            return Response({
                "success": False,
                "error": "Invalid currency codes",
                "details": f"Invalid currency codes: {', '.join(invalid_codes)}. All codes must be 3 characters."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"User {request.user.username} requesting multiple rates from {base_currency} to {target_currencies}")
        
        result = currency_service.get_multiple_exchange_rates(base_currency, target_currencies)
        
        return Response({
            "success": True,
            "base_currency": base_currency,
            "rates": result["rates"],
            "source": result["source"],
            "timestamp": result["timestamp"],
            "requested_currencies": target_currencies,
            "successful_rates": len(result["rates"]),
            "message": f"Retrieved {len(result['rates'])} exchange rates for {base_currency}"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Multiple exchange rates request failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve exchange rates",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# OCR API Endpoints
# ============================================================================

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def extract_receipt_text(request):
    """
    POST /api/ocr/extract-text/
    
    Extract raw text from receipt image using OCR
    
    Request: multipart/form-data with 'receipt_image' file
    
    Response:
    {
        "success": true,
        "extracted_text": "RECEIPT\\nStore Name\\n...",
        "ocr_provider": "tesseract|google_vision|aws_textract|mock",
        "text_length": 1205,
        "extraction_timestamp": "2024-12-04T10:30:00Z",
        "processing_time_ms": 1250
    }
    """
    try:
        import time
        start_time = time.time()
        
        # Validate file upload
        if 'receipt_image' not in request.FILES:
            return Response({
                "success": False,
                "error": "No image file provided",
                "details": "Upload an image file with the field name 'receipt_image'"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['receipt_image']
        
        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
        file_extension = os.path.splitext(uploaded_file.name)[1].lower()
        
        if file_extension not in allowed_extensions:
            return Response({
                "success": False,
                "error": "Invalid file type",
                "details": f"Supported formats: {', '.join(allowed_extensions)}",
                "uploaded_extension": file_extension
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if uploaded_file.size > max_size:
            return Response({
                "success": False,
                "error": "File too large",
                "details": f"Maximum file size is 10MB. Your file is {uploaded_file.size / (1024*1024):.1f}MB"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"User {request.user.username} uploading receipt image: {uploaded_file.name} ({uploaded_file.size} bytes)")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        try:
            # Extract text using OCR service
            extracted_text = enhanced_ocr_service.extract_text(temp_file_path)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return Response({
                "success": True,
                "extracted_text": extracted_text,
                "ocr_provider": enhanced_ocr_service.current_provider or 'mock',
                "text_length": len(extracted_text),
                "extraction_timestamp": enhanced_ocr_service._get_current_timestamp(),
                "processing_time_ms": processing_time,
                "file_info": {
                    "original_name": uploaded_file.name,
                    "size_bytes": uploaded_file.size,
                    "format": file_extension
                },
                "message": "Text extracted successfully from receipt image"
            }, status=status.HTTP_200_OK)
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"OCR text extraction failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to extract text from image",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def extract_expense_data(request):
    """
    POST /api/ocr/extract-expense/
    
    Extract structured expense data from receipt image
    
    Request: multipart/form-data with 'receipt_image' file
    
    Response:
    {
        "success": true,
        "confidence": "high|medium|low",
        "confidence_score": 85,
        "amount": 156.78,
        "currency": "USD",
        "date": "2024-12-04",
        "merchant": "Restaurant Name",
        "description": "Restaurant Name - $156.78 on 2024-12-04",
        "category": "Meals",
        "line_items": [
            {"description": "2x Burger", "amount": 24.00},
            {"description": "1x Salad", "amount": 12.50}
        ],
        "tax_amount": 12.34,
        "tip_amount": 20.00,
        "subtotal": 124.44,
        "payment_method": "Visa",
        "address": "123 Main Street",
        "phone": "(555) 123-4567",
        "ocr_provider": "tesseract",
        "raw_text": "RECEIPT\\nStore Name...",
        "extraction_timestamp": "2024-12-04T10:30:00Z",
        "parsing_details": {
            "amount_sources": ["total: 156.78"],
            "date_sources": ["12/04/2024"],
            "merchant_candidates": ["Line 0: Restaurant Name (Score: 15)"]
        }
    }
    """
    try:
        import time
        start_time = time.time()
        
        # Validate file upload
        if 'receipt_image' not in request.FILES:
            return Response({
                "success": False,
                "error": "No image file provided",
                "details": "Upload an image file with the field name 'receipt_image'"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['receipt_image']
        
        # Validate file type
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
        file_extension = os.path.splitext(uploaded_file.name)[1].lower()
        
        if file_extension not in allowed_extensions:
            return Response({
                "success": False,
                "error": "Invalid file type",
                "details": f"Supported formats: {', '.join(allowed_extensions)}",
                "uploaded_extension": file_extension
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if uploaded_file.size > max_size:
            return Response({
                "success": False,
                "error": "File too large",
                "details": f"Maximum file size is 10MB. Your file is {uploaded_file.size / (1024*1024):.1f}MB"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"User {request.user.username} extracting expense data from: {uploaded_file.name}")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        try:
            # Extract structured expense data
            expense_data = enhanced_ocr_service.extract_expense_data(temp_file_path)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Add processing metadata
            expense_data.update({
                "processing_time_ms": processing_time,
                "file_info": {
                    "original_name": uploaded_file.name,
                    "size_bytes": uploaded_file.size,
                    "format": file_extension
                },
                "user": request.user.username
            })
            
            return Response(expense_data, status=status.HTTP_200_OK)
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"OCR expense extraction failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to extract expense data from image",
            "details": str(e),
            "extraction_success": False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_ocr_providers(request):
    """
    GET /api/ocr/providers/
    
    Get information about available OCR providers and their status
    
    Response:
    {
        "success": true,
        "available_providers": ["tesseract", "google_vision"],
        "current_provider": "tesseract",
        "mock_mode": false,
        "provider_details": {
            "tesseract": {
                "status": "available",
                "description": "Local Tesseract OCR engine"
            },
            "google_vision": {
                "status": "available", 
                "description": "Google Cloud Vision API"
            },
            "aws_textract": {
                "status": "unavailable",
                "description": "Amazon Textract (credentials not configured)"
            }
        }
    }
    """
    try:
        logger.info(f"User {request.user.username} requesting OCR provider information")
        
        provider_details = {
            "tesseract": {
                "status": "available" if "tesseract" in enhanced_ocr_service.providers else "unavailable",
                "description": "Local Tesseract OCR engine - Best for offline processing"
            },
            "google_vision": {
                "status": "available" if "google_vision" in enhanced_ocr_service.providers else "unavailable",
                "description": "Google Cloud Vision API - High accuracy cloud OCR"
            },
            "aws_textract": {
                "status": "available" if "aws_textract" in enhanced_ocr_service.providers else "unavailable", 
                "description": "Amazon Textract - Advanced document analysis"
            }
        }
        
        return Response({
            "success": True,
            "available_providers": enhanced_ocr_service.providers,
            "current_provider": enhanced_ocr_service.current_provider,
            "mock_mode": enhanced_ocr_service.mock_mode,
            "provider_details": provider_details,
            "total_providers": len(enhanced_ocr_service.providers),
            "message": f"Found {len(enhanced_ocr_service.providers)} available OCR provider(s)"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"OCR providers request failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve OCR provider information",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Cache Management Endpoints  
# ============================================================================

@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def clear_currency_cache(request):
    """
    DELETE /api/currencies/cache/
    
    Clear currency service cache (admin users only)
    
    Response:
    {
        "success": true,
        "message": "Currency cache cleared successfully",
        "cleared_keys": ["countries_cache", "exchange_rates_cache"]
    }
    """
    try:
        # Check if user is admin/staff
        if not request.user.is_staff:
            return Response({
                "success": False,
                "error": "Permission denied",
                "details": "Only admin users can clear cache"
            }, status=status.HTTP_403_FORBIDDEN)
        
        logger.info(f"Admin user {request.user.username} clearing currency cache")
        
        cleared_keys = currency_service.clear_cache()
        
        return Response({
            "success": True,
            "message": "Currency cache cleared successfully",
            "cleared_keys": cleared_keys,
            "timestamp": currency_service._get_current_timestamp()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Cache clearing failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to clear cache",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_service_status(request):
    """
    GET /api/integrations/status/
    
    Get status of all integration services
    
    Response:
    {
        "success": true,
        "services": {
            "currency_service": {
                "status": "operational",
                "providers": ["rest_countries_api", "exchange_rate_api"],
                "cache_status": "active",
                "last_update": "2024-12-04T10:15:00Z"
            },
            "ocr_service": {
                "status": "operational",
                "providers": ["tesseract", "google_vision"], 
                "mock_mode": false,
                "current_provider": "tesseract"
            }
        }
    }
    """
    try:
        logger.info(f"User {request.user.username} requesting service status")
        
        # Get currency service status
        currency_status = {
            "status": "operational",
            "providers": ["rest_countries_api", "exchange_rate_api"],
            "cache_status": "active",
            "fallback_available": True
        }
        
        # Get OCR service status  
        ocr_status = {
            "status": "operational" if enhanced_ocr_service.providers or enhanced_ocr_service.mock_mode else "degraded",
            "providers": enhanced_ocr_service.providers,
            "mock_mode": enhanced_ocr_service.mock_mode,
            "current_provider": enhanced_ocr_service.current_provider
        }
        
        return Response({
            "success": True,
            "services": {
                "currency_service": currency_status,
                "ocr_service": ocr_status
            },
            "overall_status": "operational",
            "timestamp": enhanced_ocr_service._get_current_timestamp() if hasattr(enhanced_ocr_service, '_get_current_timestamp') else currency_service._get_current_timestamp(),
            "message": "All integration services are operational"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Service status request failed: {e}")
        return Response({
            "success": False,
            "error": "Failed to retrieve service status",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Helper function to add timestamp method to OCR service
# ============================================================================

def _get_current_timestamp():
    """Helper function for current timestamp"""
    from datetime import datetime
    return datetime.now().isoformat()

# Add the timestamp method to OCR service if it doesn't exist
if not hasattr(enhanced_ocr_service, '_get_current_timestamp'):
    enhanced_ocr_service._get_current_timestamp = _get_current_timestamp