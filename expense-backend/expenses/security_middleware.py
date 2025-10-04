"""
Security and Validation Middleware for Expense Management System
Provides additional security layers and request validation
"""

import logging
import json
import time
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from rest_framework import status
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

User = get_user_model()

class SecurityValidationMiddleware(MiddlewareMixin):
    """
    Middleware for additional security and validation checks
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Rate limiting configuration
        self.rate_limits = {
            'api/login/': {'requests': 5, 'window': 300},  # 5 attempts per 5 minutes
            'api/signup/': {'requests': 3, 'window': 600},  # 3 attempts per 10 minutes
            'api/secure/': {'requests': 100, 'window': 300},  # 100 requests per 5 minutes for secure endpoints
            'default': {'requests': 200, 'window': 300}  # Default rate limit
        }
        
        # Secure endpoints that require additional validation
        self.secure_endpoints = [
            '/api/secure/',
            '/api/approval-rules/',
            '/api/currencies/',
            '/api/ocr/'
        ]
    
    def process_request(self, request):
        """
        Process incoming requests for security validation
        """
        try:
            # Apply rate limiting
            rate_limit_response = self.check_rate_limit(request)
            if rate_limit_response:
                return rate_limit_response
            
            # Validate secure endpoints
            security_response = self.validate_secure_endpoint(request)
            if security_response:
                return security_response
            
            # Log security events
            self.log_security_event(request)
            
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            # Don't block requests due to middleware errors
            pass
        
        return None
    
    def process_response(self, request, response):
        """
        Process outgoing responses for additional security headers
        """
        try:
            # Add security headers
            response = self.add_security_headers(response)
            
            # Log failed attempts
            if hasattr(response, 'status_code') and response.status_code in [401, 403]:
                self.log_failed_attempt(request, response)
            
        except Exception as e:
            logger.error(f"Security middleware response error: {e}")
        
        return response
    
    def check_rate_limit(self, request) -> Optional[JsonResponse]:
        """
        Check rate limiting for the request
        """
        try:
            # Get client identifier (IP + User ID if authenticated)
            client_ip = self.get_client_ip(request)
            user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
            client_id = f"{client_ip}_{user_id}"
            
            # Determine rate limit based on endpoint
            endpoint_key = self.get_endpoint_key(request.path)
            rate_config = self.rate_limits.get(endpoint_key, self.rate_limits['default'])
            
            # Cache key for rate limiting
            cache_key = f"rate_limit_{endpoint_key}_{client_id}"
            
            # Get current count
            current_count = cache.get(cache_key, 0)
            
            if current_count >= rate_config['requests']:
                logger.warning(f"Rate limit exceeded for {client_ip} on {request.path}")
                return JsonResponse({
                    "success": False,
                    "error": "Rate limit exceeded",
                    "details": f"Too many requests. Try again in {rate_config['window']} seconds.",
                    "retry_after": rate_config['window']
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Increment count
            cache.set(cache_key, current_count + 1, rate_config['window'])
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
        
        return None
    
    def validate_secure_endpoint(self, request) -> Optional[JsonResponse]:
        """
        Validate access to secure endpoints
        """
        try:
            # Check if this is a secure endpoint
            is_secure = any(request.path.startswith(endpoint) for endpoint in self.secure_endpoints)
            
            if not is_secure:
                return None
            
            # Check authentication for secure endpoints
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return JsonResponse({
                    "success": False,
                    "error": "Authentication required",
                    "details": "This endpoint requires authentication"
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Check for suspicious patterns
            suspicious_response = self.check_suspicious_patterns(request)
            if suspicious_response:
                return suspicious_response
            
        except Exception as e:
            logger.error(f"Secure endpoint validation error: {e}")
        
        return None
    
    def check_suspicious_patterns(self, request) -> Optional[JsonResponse]:
        """
        Check for suspicious request patterns
        """
        try:
            # Check for SQL injection patterns in query parameters
            suspicious_patterns = [
                'union select', 'drop table', 'delete from', 'insert into',
                'update set', '--', '/*', '*/', 'xp_cmdshell', 'sp_executesql'
            ]
            
            query_string = request.GET.urlencode().lower()
            for pattern in suspicious_patterns:
                if pattern in query_string:
                    logger.warning(f"Suspicious pattern detected: {pattern} from {self.get_client_ip(request)}")
                    return JsonResponse({
                        "success": False,
                        "error": "Invalid request",
                        "details": "Request contains invalid characters"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for excessive parameter count
            if len(request.GET) > 50:
                logger.warning(f"Excessive parameters from {self.get_client_ip(request)}: {len(request.GET)}")
                return JsonResponse({
                    "success": False,
                    "error": "Too many parameters",
                    "details": "Request contains too many parameters"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check request size for POST/PUT requests
            if request.method in ['POST', 'PUT', 'PATCH']:
                content_length = request.META.get('CONTENT_LENGTH')
                if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB limit
                    logger.warning(f"Large request from {self.get_client_ip(request)}: {content_length} bytes")
                    return JsonResponse({
                        "success": False,
                        "error": "Request too large",
                        "details": "Request size exceeds limit"
                    }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
            
        except Exception as e:
            logger.error(f"Suspicious pattern check error: {e}")
        
        return None
    
    def add_security_headers(self, response):
        """
        Add security headers to response
        """
        try:
            # Add standard security headers
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['X-XSS-Protection'] = '1; mode=block'
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            
            # Add CORS headers if not already present
            if 'Access-Control-Allow-Origin' not in response:
                response['Access-Control-Allow-Origin'] = getattr(settings, 'CORS_ALLOWED_ORIGINS', ['http://localhost:3000'])[0]
            
            # Add custom headers for API identification
            response['X-API-Version'] = '1.0'
            response['X-Expense-API'] = 'Secure'
            
        except Exception as e:
            logger.error(f"Security headers error: {e}")
        
        return response
    
    def log_security_event(self, request):
        """
        Log security-relevant events
        """
        try:
            # Log access to secure endpoints
            if any(request.path.startswith(endpoint) for endpoint in self.secure_endpoints):
                user_info = "anonymous"
                if hasattr(request, 'user') and request.user.is_authenticated:
                    user_info = f"{request.user.email} (ID: {request.user.id})"
                
                logger.info(f"Secure endpoint access: {request.method} {request.path} by {user_info} from {self.get_client_ip(request)}")
        
        except Exception as e:
            logger.error(f"Security logging error: {e}")
    
    def log_failed_attempt(self, request, response):
        """
        Log failed authentication/authorization attempts
        """
        try:
            client_ip = self.get_client_ip(request)
            status_code = getattr(response, 'status_code', 'unknown')
            
            # Track failed attempts
            failed_key = f"failed_attempts_{client_ip}"
            failed_count = cache.get(failed_key, 0) + 1
            cache.set(failed_key, failed_count, 3600)  # Track for 1 hour
            
            logger.warning(f"Failed attempt {failed_count}: {request.method} {request.path} "
                         f"returned {status_code} from {client_ip}")
            
            # Alert on multiple failures
            if failed_count >= 10:
                logger.error(f"Multiple failed attempts detected from {client_ip}: {failed_count} failures")
        
        except Exception as e:
            logger.error(f"Failed attempt logging error: {e}")
    
    def get_client_ip(self, request):
        """
        Get client IP address from request
        """
        try:
            # Check for forwarded headers
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                return x_forwarded_for.split(',')[0].strip()
            
            x_real_ip = request.META.get('HTTP_X_REAL_IP')
            if x_real_ip:
                return x_real_ip
            
            return request.META.get('REMOTE_ADDR', 'unknown')
        
        except Exception:
            return 'unknown'
    
    def get_endpoint_key(self, path):
        """
        Get rate limiting key based on endpoint path
        """
        for endpoint_key in self.rate_limits.keys():
            if endpoint_key != 'default' and endpoint_key in path:
                return endpoint_key
        return 'default'


class RequestValidationMiddleware(MiddlewareMixin):
    """
    Middleware for request data validation
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Content type validation
        self.allowed_content_types = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain'
        ]
        
        # Required headers for API endpoints
        self.api_required_headers = {
            '/api/secure/': ['Authorization']
        }
    
    def process_request(self, request):
        """
        Validate incoming request data
        """
        try:
            # Validate content type for POST/PUT requests
            if request.method in ['POST', 'PUT', 'PATCH']:
                content_type = request.META.get('CONTENT_TYPE', '').split(';')[0]
                if content_type and not any(allowed in content_type for allowed in self.allowed_content_types):
                    return JsonResponse({
                        "success": False,
                        "error": "Invalid content type",
                        "details": f"Content type '{content_type}' is not allowed"
                    }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
            
            # Validate required headers
            header_response = self.validate_headers(request)
            if header_response:
                return header_response
            
            # Validate JSON data
            if request.content_type == 'application/json' and request.body:
                json_response = self.validate_json_data(request)
                if json_response:
                    return json_response
        
        except Exception as e:
            logger.error(f"Request validation error: {e}")
        
        return None
    
    def validate_headers(self, request) -> Optional[JsonResponse]:
        """
        Validate required headers for API endpoints
        """
        try:
            for endpoint_pattern, required_headers in self.api_required_headers.items():
                if request.path.startswith(endpoint_pattern):
                    for header in required_headers:
                        if header not in request.META:
                            header_key = f"HTTP_{header.upper().replace('-', '_')}"
                            if header_key not in request.META:
                                return JsonResponse({
                                    "success": False,
                                    "error": "Missing required header",
                                    "details": f"Header '{header}' is required for this endpoint"
                                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"Header validation error: {e}")
        
        return None
    
    def validate_json_data(self, request) -> Optional[JsonResponse]:
        """
        Validate JSON request data
        """
        try:
            # Try to parse JSON
            try:
                json.loads(request.body.decode('utf-8'))
            except json.JSONDecodeError as e:
                return JsonResponse({
                    "success": False,
                    "error": "Invalid JSON format",
                    "details": f"JSON parsing error: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for deeply nested objects (DoS protection)
            max_depth = 10
            if self.get_json_depth(json.loads(request.body.decode('utf-8'))) > max_depth:
                return JsonResponse({
                    "success": False,
                    "error": "JSON structure too complex",
                    "details": f"JSON nesting depth exceeds {max_depth} levels"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"JSON validation error: {e}")
        
        return None
    
    def get_json_depth(self, obj, depth=0):
        """
        Calculate depth of JSON object
        """
        if isinstance(obj, dict):
            return max([self.get_json_depth(value, depth + 1) for value in obj.values()] + [depth])
        elif isinstance(obj, list):
            return max([self.get_json_depth(item, depth + 1) for item in obj] + [depth])
        else:
            return depth


class AuditLoggingMiddleware(MiddlewareMixin):
    """
    Middleware for comprehensive audit logging
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.get_response = get_response
        
        # Endpoints to audit
        self.audit_endpoints = [
            '/api/secure/',
            '/api/approval-rules/',
            '/api/login/',
            '/api/logout/'
        ]
        
        # Sensitive data fields to mask in logs
        self.sensitive_fields = [
            'password', 'token', 'authorization', 'secret', 'key'
        ]
    
    def process_request(self, request):
        """
        Log request details for audit trail
        """
        try:
            # Check if this endpoint should be audited
            should_audit = any(request.path.startswith(endpoint) for endpoint in self.audit_endpoints)
            
            if should_audit:
                # Store request start time
                request.audit_start_time = time.time()
                
                # Prepare audit data
                audit_data = {
                    'timestamp': datetime.now().isoformat(),
                    'method': request.method,
                    'path': request.path,
                    'query_params': dict(request.GET),
                    'client_ip': self.get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', 'unknown'),
                    'user': self.get_user_info(request)
                }
                
                # Add request body for POST/PUT (masked)
                if request.method in ['POST', 'PUT', 'PATCH'] and request.body:
                    try:
                        body_data = json.loads(request.body.decode('utf-8'))
                        audit_data['request_body'] = self.mask_sensitive_data(body_data)
                    except:
                        audit_data['request_body'] = '[Binary or invalid JSON data]'
                
                # Store for response logging
                request.audit_data = audit_data
        
        except Exception as e:
            logger.error(f"Audit logging request error: {e}")
        
        return None
    
    def process_response(self, request, response):
        """
        Log response details for audit trail
        """
        try:
            if hasattr(request, 'audit_data'):
                audit_data = request.audit_data
                
                # Add response information
                audit_data.update({
                    'status_code': getattr(response, 'status_code', 'unknown'),
                    'response_time_ms': round((time.time() - request.audit_start_time) * 1000, 2) if hasattr(request, 'audit_start_time') else None
                })
                
                # Add response body for errors or specific endpoints (masked)
                if hasattr(response, 'status_code') and (response.status_code >= 400 or '/secure/' in request.path):
                    try:
                        if hasattr(response, 'content'):
                            response_data = json.loads(response.content.decode('utf-8'))
                            audit_data['response_body'] = self.mask_sensitive_data(response_data)
                    except:
                        audit_data['response_body'] = '[Binary or invalid JSON data]'
                
                # Log the audit entry
                logger.info(f"AUDIT: {json.dumps(audit_data, indent=None, separators=(',', ':'))}")
        
        except Exception as e:
            logger.error(f"Audit logging response error: {e}")
        
        return response
    
    def get_client_ip(self, request):
        """
        Get client IP address from request
        """
        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                return x_forwarded_for.split(',')[0].strip()
            return request.META.get('REMOTE_ADDR', 'unknown')
        except:
            return 'unknown'
    
    def get_user_info(self, request):
        """
        Get user information from request
        """
        try:
            if hasattr(request, 'user') and request.user.is_authenticated:
                return {
                    'id': request.user.id,
                    'email': request.user.email,
                    'role': getattr(request.user, 'role', 'unknown')
                }
            return {'anonymous': True}
        except:
            return {'error': 'Unable to determine user'}
    
    def mask_sensitive_data(self, data):
        """
        Mask sensitive data in request/response bodies
        """
        try:
            if isinstance(data, dict):
                masked_data = {}
                for key, value in data.items():
                    if any(sensitive in key.lower() for sensitive in self.sensitive_fields):
                        masked_data[key] = '[MASKED]'
                    elif isinstance(value, (dict, list)):
                        masked_data[key] = self.mask_sensitive_data(value)
                    else:
                        masked_data[key] = value
                return masked_data
            elif isinstance(data, list):
                return [self.mask_sensitive_data(item) for item in data]
            else:
                return data
        except:
            return '[Error masking data]'