#!/usr/bin/env python3
"""
Step 17: Test Settings Configuration
===================================

Optimized Django settings for testing with offline capabilities.
Ensures all tests can run without external dependencies.

Author: GitHub Copilot
Date: October 4, 2025
"""

from .settings import *
import sys

# Test Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',  # Use in-memory database for faster tests
        'OPTIONS': {
            'timeout': 20,
        }
    }
}

# Disable migrations for faster test setup
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

# Allow migrations for tests (needed for table creation)
# if 'test' in sys.argv:
#     MIGRATION_MODULES = DisableMigrations()

# Test-specific settings
DEBUG = False
TESTING = True
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

# Disable unnecessary middleware for testing
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Note: Removed custom security middleware for faster testing
]

# Password validation (simplified for testing)
AUTH_PASSWORD_VALIDATORS = []

# Cache configuration for testing
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
    }
}

# Email backend for testing
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Static files (not needed for API testing)
STATIC_URL = '/static/'

# Media files (use temp directory for testing)
import tempfile
MEDIA_ROOT = tempfile.mkdtemp()

# Logging configuration for testing
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',  # Reduce noise during testing
        },
        'expenses': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}

# Disable external API calls during testing
OFFLINE_MODE = True

# Mock external service URLs
CURRENCY_API_URL = 'http://mock-currency-api.local'
OCR_SERVICE_URL = 'http://mock-ocr-service.local'

# Test-specific API settings
REST_FRAMEWORK.update({
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
    'TEST_REQUEST_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
})

# Security settings for testing
SECRET_KEY = 'test-secret-key-not-for-production'
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

# CORS settings for testing
CORS_ALLOW_ALL_ORIGINS = True

# Disable CSRF for API testing
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

# File upload limits for testing
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Test data settings
TEST_COMPANY_NAME = "Test Corporation"
TEST_ADMIN_EMAIL = "admin@test.com"
TEST_ADMIN_PASSWORD = "testpass123"

# Performance settings for testing
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: False,
}

# Celery settings for testing (if used)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

print("📋 Using test settings configuration")
print(f"   Database: {DATABASES['default']['ENGINE']}")
print(f"   Cache: {CACHES['default']['BACKEND']}")
print(f"   Debug: {DEBUG}")
print(f"   Offline mode: {OFFLINE_MODE}")