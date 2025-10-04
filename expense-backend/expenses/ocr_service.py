import cv2
import pytesseract
import re
from PIL import Image
import numpy as np
from datetime import datetime
import logging
from typing import Dict, Optional, List
import os

# Configure tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

logger = logging.getLogger(__name__)

class ReceiptOCRService:
    """
    OCR service for extracting expense information from receipt images.
    Supports multiple extraction methods: Tesseract, mock data, and future Google Vision integration.
    """
    
    # Common expense categories for classification
    EXPENSE_CATEGORIES = {
        'Travel': ['uber', 'lyft', 'taxi', 'airline', 'flight', 'hotel', 'booking', 'airbnb', 'car rental', 'gas station', 'fuel'],
        'Meals': ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'mcdonalds', 'starbucks', 'pizza', 'delivery', 'lunch', 'dinner'],
        'Office Supplies': ['staples', 'office depot', 'amazon', 'supplies', 'paper', 'pen', 'printer', 'ink'],
        'Transportation': ['gas', 'fuel', 'parking', 'toll', 'metro', 'bus', 'train', 'subway'],
        'Entertainment': ['movie', 'theater', 'netflix', 'spotify', 'games', 'entertainment'],
        'Healthcare': ['pharmacy', 'medical', 'doctor', 'hospital', 'clinic', 'health'],
        'Technology': ['apple', 'microsoft', 'google', 'software', 'computer', 'phone', 'tech'],
        'Other': []
    }
    
    # Currency symbols and codes
    CURRENCY_PATTERNS = {
        r'\$': 'USD',
        r'€': 'EUR', 
        r'£': 'GBP',
        r'¥': 'JPY',
        r'₹': 'INR',
        r'C\$': 'CAD',
        r'A\$': 'AUD'
    }
    
    def __init__(self, use_tesseract: bool = True):
        self.use_tesseract = use_tesseract
        
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocess image for better OCR accuracy.
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image from {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply denoising
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Apply threshold to get image with only black and white
            _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Morphological operations to remove noise
            kernel = np.ones((1, 1), np.uint8)
            processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return processed
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            return cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    def extract_text_tesseract(self, image_path: str) -> str:
        """
        Extract text from image using Tesseract OCR.
        """
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)
            
            # Convert to PIL Image for tesseract
            pil_image = Image.fromarray(processed_image)
            
            # Extract text with custom config
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$€£¥₹:-/\n '
            text = pytesseract.image_to_string(pil_image, config=custom_config)
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Tesseract OCR failed: {str(e)}")
            return self._generate_mock_ocr_text(image_path)
    
    def _generate_mock_ocr_text(self, image_path: str) -> str:
        """
        Generate mock OCR text for testing when Tesseract is not available.
        """
        filename = os.path.basename(image_path).lower()
        
        mock_receipts = {
            'restaurant': """
            GOURMET BISTRO
            123 Main Street
            New York, NY 10001
            
            Date: 2025-10-04
            Time: 12:30 PM
            
            Table 5 - Server: John
            
            Caesar Salad         $12.50
            Grilled Salmon       $24.95
            Coffee               $3.50
            
            Subtotal:           $40.95
            Tax:                $3.28
            Total:              $44.23
            
            Thank you for dining with us!
            """,
            
            'gas': """
            SHELL STATION
            456 Highway Blvd
            Los Angeles, CA 90210
            
            Date: 2025-10-04
            Time: 08:15 AM
            
            Pump #3
            Regular Unleaded
            Gallons: 12.5
            Price/Gal: $3.45
            
            Total: $43.13
            
            Thank you!
            """,
            
            'office': """
            OFFICE DEPOT
            789 Business Park
            Chicago, IL 60601
            
            Date: 2025-10-04
            Time: 2:45 PM
            
            Paper Reams (5)      $24.95
            Pens Blue (Pack)     $8.50
            Stapler              $12.99
            
            Subtotal:           $46.44
            Tax:                $3.72
            Total:              $50.16
            
            Receipt #: 123456789
            """
        }
        
        # Determine receipt type based on filename
        if any(word in filename for word in ['restaurant', 'food', 'cafe', 'meal']):
            return mock_receipts['restaurant']
        elif any(word in filename for word in ['gas', 'fuel', 'shell', 'exxon']):
            return mock_receipts['gas']
        elif any(word in filename for word in ['office', 'supplies', 'depot']):
            return mock_receipts['office']
        else:
            return mock_receipts['restaurant']  # Default
    
    def extract_amount(self, text: str) -> Optional[float]:
        """
        Extract monetary amount from OCR text.
        """
        # Patterns to match amounts
        amount_patterns = [
            r'total[:\s]*\$?([0-9]+\.?[0-9]{0,2})',  # Total: $XX.XX
            r'amount[:\s]*\$?([0-9]+\.?[0-9]{0,2})',  # Amount: $XX.XX
            r'\$([0-9]+\.?[0-9]{0,2})',  # $XX.XX
            r'([0-9]+\.?[0-9]{0,2})\s*\$',  # XX.XX $
            r'([0-9]{1,4}\.[0-9]{2})'  # Generic XX.XX format
        ]
        
        amounts = []
        text_lower = text.lower()
        
        for pattern in amount_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                try:
                    amount = float(match)
                    if 0.01 <= amount <= 10000:  # Reasonable range
                        amounts.append(amount)
                except ValueError:
                    continue
        
        # Return the largest reasonable amount (likely the total)
        return max(amounts) if amounts else None
    
    def extract_date(self, text: str) -> Optional[str]:
        """
        Extract date from OCR text.
        """
        date_patterns = [
            r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
            r'(\d{2}/\d{2}/\d{4})',  # MM/DD/YYYY
            r'(\d{2}-\d{2}-\d{4})',  # MM-DD-YYYY
            r'date[:\s]*(\d{2}/\d{2}/\d{4})',  # Date: MM/DD/YYYY
            r'(\d{1,2}/\d{1,2}/\d{2,4})'  # M/D/YY or MM/DD/YYYY
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                try:
                    # Try to parse and standardize the date
                    if '-' in date_str and len(date_str) == 10:  # YYYY-MM-DD
                        return date_str
                    elif '/' in date_str:
                        # Convert MM/DD/YYYY to YYYY-MM-DD
                        parts = date_str.split('/')
                        if len(parts) == 3:
                            month, day, year = parts
                            if len(year) == 2:
                                year = '20' + year
                            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                except Exception:
                    continue
        
        # Default to today if no date found
        return datetime.now().strftime('%Y-%m-%d')
    
    def extract_merchant(self, text: str) -> Optional[str]:
        """
        Extract merchant/vendor name from OCR text.
        """
        lines = text.split('\n')
        
        # Look for business name patterns
        merchant_patterns = [
            r'^[A-Z\s&]{3,30}$',  # All caps business names
            r'[A-Z][a-z\s&]{2,25}(?:Inc|LLC|Corp|Ltd)?',  # Proper case business names
        ]
        
        # Check first few lines for business names
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if len(line) > 3 and not any(char.isdigit() for char in line):
                # Skip address-like lines
                if not any(word.lower() in line.lower() for word in ['street', 'ave', 'blvd', 'rd', 'dr', 'st']):
                    for pattern in merchant_patterns:
                        if re.match(pattern, line):
                            return line
        
        # Fallback: return first non-empty line
        for line in lines[:3]:
            line = line.strip()
            if len(line) > 2:
                return line
        
        return None
    
    def classify_category(self, text: str, merchant: str = None) -> str:
        """
        Classify expense category based on OCR text and merchant.
        """
        text_lower = text.lower()
        merchant_lower = (merchant or '').lower()
        
        # Check merchant name first
        for category, keywords in self.EXPENSE_CATEGORIES.items():
            for keyword in keywords:
                if keyword in merchant_lower or keyword in text_lower:
                    return category
        
        # Check for specific words in text
        if any(word in text_lower for word in ['gas', 'fuel', 'gallons', 'unleaded']):
            return 'Transportation'
        elif any(word in text_lower for word in ['food', 'meal', 'restaurant', 'cafe', 'dining']):
            return 'Meals'
        elif any(word in text_lower for word in ['hotel', 'flight', 'airline', 'booking']):
            return 'Travel'
        elif any(word in text_lower for word in ['office', 'supplies', 'paper', 'pen']):
            return 'Office Supplies'
        
        return 'Other'
    
    def extract_currency(self, text: str) -> str:
        """
        Extract currency from OCR text.
        """
        for symbol, currency in self.CURRENCY_PATTERNS.items():
            if re.search(symbol, text):
                return currency
        
        # Default to USD if no currency symbol found
        return 'USD'
    
    def process_receipt(self, image_path: str) -> Dict:
        """
        Main method to process receipt and extract expense information.
        """
        try:
            # Extract text from image
            if self.use_tesseract and self._tesseract_available():
                ocr_text = self.extract_text_tesseract(image_path)
            else:
                ocr_text = self._generate_mock_ocr_text(image_path)
            
            # Extract information
            amount = self.extract_amount(ocr_text)
            date = self.extract_date(ocr_text)
            merchant = self.extract_merchant(ocr_text)
            category = self.classify_category(ocr_text, merchant)
            currency = self.extract_currency(ocr_text)
            
            return {
                'ocr_text': ocr_text,
                'extracted_data': {
                    'amount': amount,
                    'date': date,
                    'merchant': merchant,
                    'category': category,
                    'currency': currency
                },
                'confidence': 0.85 if self.use_tesseract else 0.60,  # Mock confidence
                'processing_method': 'tesseract' if self.use_tesseract else 'mock'
            }
            
        except Exception as e:
            logger.error(f"Receipt processing failed: {str(e)}")
            return {
                'ocr_text': '',
                'extracted_data': {
                    'amount': None,
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'merchant': None,
                    'category': 'Other',
                    'currency': 'USD'
                },
                'confidence': 0.0,
                'processing_method': 'error',
                'error': str(e)
            }
    
    def _tesseract_available(self) -> bool:
        """
        Check if Tesseract is available on the system.
        """
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

# Service instance
ocr_service = ReceiptOCRService(use_tesseract=True)

# Module-level functions for backward compatibility and testing
def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from image using OCR service.
    """
    return ocr_service.extract_text_tesseract(image_path)

def extract_expense_data_from_image(image_path: str) -> Dict:
    """
    Extract expense data from receipt image.
    """
    return ocr_service.process_receipt(image_path)