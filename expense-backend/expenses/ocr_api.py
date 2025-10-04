"""
OCR API module for expense management system.
Provides a simple interface for OCR operations.
"""

from .ocr_service import extract_text_from_image, extract_expense_data_from_image

__all__ = ['extract_text_from_image', 'extract_expense_data_from_image']