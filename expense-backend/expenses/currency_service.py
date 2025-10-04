"""
Step 15: Currency Integration Service
External API integrations for countries/currencies and real-time exchange rates
"""

import requests
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
import time

logger = logging.getLogger(__name__)


class CurrencyService:
    """
    Service for handling currency operations including:
    - Fetching countries and their currencies from REST Countries API
    - Getting real-time exchange rates from ExchangeRate API
    - Caching for performance and offline fallback
    """
    
    # API endpoints
    REST_COUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=name,currencies"
    EXCHANGE_RATE_URL = "https://api.exchangerate-api.com/v4/latest"
    
    # Cache keys and timeouts
    COUNTRIES_CACHE_KEY = "currency_countries_data"
    COUNTRIES_CACHE_TIMEOUT = 86400  # 24 hours
    
    EXCHANGE_RATE_CACHE_KEY = "exchange_rates_{base}"
    EXCHANGE_RATE_CACHE_TIMEOUT = 3600  # 1 hour
    
    # Fallback data for offline mode
    FALLBACK_COUNTRIES = [
        {"name": {"common": "United States"}, "currencies": {"USD": {"name": "United States dollar", "symbol": "$"}}},
        {"name": {"common": "United Kingdom"}, "currencies": {"GBP": {"name": "British pound", "symbol": "£"}}},
        {"name": {"common": "Canada"}, "currencies": {"CAD": {"name": "Canadian dollar", "symbol": "C$"}}},
        {"name": {"common": "Australia"}, "currencies": {"AUD": {"name": "Australian dollar", "symbol": "A$"}}},
        {"name": {"common": "Germany"}, "currencies": {"EUR": {"name": "Euro", "symbol": "€"}}},
        {"name": {"common": "France"}, "currencies": {"EUR": {"name": "Euro", "symbol": "€"}}},
        {"name": {"common": "Japan"}, "currencies": {"JPY": {"name": "Japanese yen", "symbol": "¥"}}},
        {"name": {"common": "China"}, "currencies": {"CNY": {"name": "Chinese yuan", "symbol": "¥"}}},
        {"name": {"common": "India"}, "currencies": {"INR": {"name": "Indian rupee", "symbol": "₹"}}},
        {"name": {"common": "Brazil"}, "currencies": {"BRL": {"name": "Brazilian real", "symbol": "R$"}}},
        {"name": {"common": "Mexico"}, "currencies": {"MXN": {"name": "Mexican peso", "symbol": "$"}}},
        {"name": {"common": "South Korea"}, "currencies": {"KRW": {"name": "South Korean won", "symbol": "₩"}}},
        {"name": {"common": "Singapore"}, "currencies": {"SGD": {"name": "Singapore dollar", "symbol": "S$"}}},
        {"name": {"common": "Switzerland"}, "currencies": {"CHF": {"name": "Swiss franc", "symbol": "CHF"}}},
        {"name": {"common": "Norway"}, "currencies": {"NOK": {"name": "Norwegian krone", "symbol": "kr"}}},
        {"name": {"common": "Sweden"}, "currencies": {"SEK": {"name": "Swedish krona", "symbol": "kr"}}},
        {"name": {"common": "Denmark"}, "currencies": {"DKK": {"name": "Danish krone", "symbol": "kr"}}},
    ]
    
    FALLBACK_EXCHANGE_RATES = {
        "USD": {"EUR": 0.85, "GBP": 0.73, "CAD": 1.25, "AUD": 1.35, "JPY": 110.0, "CNY": 6.45, "INR": 74.5, "BRL": 5.2, "CHF": 0.92, "SGD": 1.35},
        "EUR": {"USD": 1.18, "GBP": 0.86, "CAD": 1.47, "AUD": 1.59, "JPY": 129.0, "CNY": 7.6, "INR": 87.8, "BRL": 6.1, "CHF": 1.08, "SGD": 1.59},
        "GBP": {"USD": 1.37, "EUR": 1.16, "CAD": 1.71, "AUD": 1.85, "JPY": 150.0, "CNY": 8.8, "INR": 102.0, "BRL": 7.1, "CHF": 1.26, "SGD": 1.85},
    }
    
    @classmethod
    def get_countries_and_currencies(cls) -> Dict[str, Any]:
        """
        Fetch countries and their currencies from REST Countries API
        
        Returns:
            Dict containing countries data with fallback support
        """
        try:
            # Check cache first
            cached_data = cache.get(cls.COUNTRIES_CACHE_KEY)
            if cached_data:
                logger.info("Retrieved countries data from cache")
                return {
                    'success': True,
                    'data': cached_data,
                    'source': 'cache',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Fetch from API
            logger.info("Fetching countries data from REST Countries API")
            response = requests.get(cls.REST_COUNTRIES_URL, timeout=10)
            response.raise_for_status()
            
            countries_data = response.json()
            
            # Process and normalize data
            processed_countries = []
            currencies_set = set()
            
            for country in countries_data:
                if 'currencies' in country and country['currencies']:
                    country_name = country.get('name', {}).get('common', 'Unknown')
                    
                    for currency_code, currency_info in country['currencies'].items():
                        currency_name = currency_info.get('name', currency_code)
                        currency_symbol = currency_info.get('symbol', currency_code)
                        
                        processed_country = {
                            'country': country_name,
                            'currency_code': currency_code,
                            'currency_name': currency_name,
                            'currency_symbol': currency_symbol
                        }
                        processed_countries.append(processed_country)
                        currencies_set.add(currency_code)
            
            # Sort by country name
            processed_countries.sort(key=lambda x: x['country'])
            
            result_data = {
                'countries': processed_countries,
                'available_currencies': sorted(list(currencies_set)),
                'total_countries': len(processed_countries),
                'total_currencies': len(currencies_set)
            }
            
            # Cache the result
            cache.set(cls.COUNTRIES_CACHE_KEY, result_data, cls.COUNTRIES_CACHE_TIMEOUT)
            
            logger.info(f"Successfully fetched {len(processed_countries)} countries with {len(currencies_set)} currencies")
            
            return {
                'success': True,
                'data': result_data,
                'source': 'api',
                'timestamp': datetime.now().isoformat()
            }
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Failed to fetch from REST Countries API: {e}")
            return cls._get_fallback_countries_data()
        except Exception as e:
            logger.error(f"Unexpected error fetching countries data: {e}")
            return cls._get_fallback_countries_data()
    
    @classmethod
    def _get_fallback_countries_data(cls) -> Dict[str, Any]:
        """Return fallback countries data when API is unavailable"""
        logger.info("Using fallback countries data")
        
        processed_countries = []
        currencies_set = set()
        
        for country in cls.FALLBACK_COUNTRIES:
            country_name = country['name']['common']
            
            for currency_code, currency_info in country['currencies'].items():
                currency_name = currency_info['name']
                currency_symbol = currency_info['symbol']
                
                processed_country = {
                    'country': country_name,
                    'currency_code': currency_code,
                    'currency_name': currency_name,
                    'currency_symbol': currency_symbol
                }
                processed_countries.append(processed_country)
                currencies_set.add(currency_code)
        
        result_data = {
            'countries': processed_countries,
            'available_currencies': sorted(list(currencies_set)),
            'total_countries': len(processed_countries),
            'total_currencies': len(currencies_set)
        }
        
        return {
            'success': True,
            'data': result_data,
            'source': 'fallback',
            'timestamp': datetime.now().isoformat(),
            'warning': 'Using offline fallback data - limited currency selection'
        }
    
    @classmethod
    def get_exchange_rate(cls, base_currency: str, target_currency: str) -> Dict[str, Any]:
        """
        Get exchange rate between two currencies
        
        Args:
            base_currency: Base currency code (e.g., 'USD')
            target_currency: Target currency code (e.g., 'EUR')
            
        Returns:
            Dict containing exchange rate data with fallback support
        """
        try:
            # Normalize currency codes
            base_currency = base_currency.upper()
            target_currency = target_currency.upper()
            
            # Same currency check
            if base_currency == target_currency:
                return {
                    'success': True,
                    'data': {
                        'base': base_currency,
                        'target': target_currency,
                        'rate': 1.0,
                        'date': datetime.now().strftime('%Y-%m-%d'),
                        'timestamp': int(time.time())
                    },
                    'source': 'direct',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Check cache first
            cache_key = cls.EXCHANGE_RATE_CACHE_KEY.format(base=base_currency)
            cached_rates = cache.get(cache_key)
            
            if cached_rates and target_currency in cached_rates.get('rates', {}):
                rate = cached_rates['rates'][target_currency]
                logger.info(f"Retrieved exchange rate from cache: {base_currency} -> {target_currency} = {rate}")
                
                return {
                    'success': True,
                    'data': {
                        'base': base_currency,
                        'target': target_currency,
                        'rate': rate,
                        'date': cached_rates.get('date'),
                        'timestamp': cached_rates.get('timestamp')
                    },
                    'source': 'cache',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Fetch from API
            logger.info(f"Fetching exchange rates for {base_currency} from ExchangeRate API")
            response = requests.get(f"{cls.EXCHANGE_RATE_URL}/{base_currency}", timeout=10)
            response.raise_for_status()
            
            rate_data = response.json()
            
            if target_currency not in rate_data.get('rates', {}):
                raise ValueError(f"Exchange rate not available for {base_currency} -> {target_currency}")
            
            rate = rate_data['rates'][target_currency]
            
            # Cache the entire rates response
            cache.set(cache_key, rate_data, cls.EXCHANGE_RATE_CACHE_TIMEOUT)
            
            logger.info(f"Successfully fetched exchange rate: {base_currency} -> {target_currency} = {rate}")
            
            return {
                'success': True,
                'data': {
                    'base': base_currency,
                    'target': target_currency,
                    'rate': rate,
                    'date': rate_data.get('date'),
                    'timestamp': rate_data.get('time_last_updated', int(time.time()))
                },
                'source': 'api',
                'timestamp': datetime.now().isoformat()
            }
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Failed to fetch exchange rate from API: {e}")
            return cls._get_fallback_exchange_rate(base_currency, target_currency)
        except Exception as e:
            logger.error(f"Unexpected error fetching exchange rate: {e}")
            return cls._get_fallback_exchange_rate(base_currency, target_currency)
    
    @classmethod
    def _get_fallback_exchange_rate(cls, base_currency: str, target_currency: str) -> Dict[str, Any]:
        """Return fallback exchange rate when API is unavailable"""
        logger.info(f"Using fallback exchange rate: {base_currency} -> {target_currency}")
        
        # Check if we have fallback data for this currency pair
        if base_currency in cls.FALLBACK_EXCHANGE_RATES:
            if target_currency in cls.FALLBACK_EXCHANGE_RATES[base_currency]:
                rate = cls.FALLBACK_EXCHANGE_RATES[base_currency][target_currency]
                
                return {
                    'success': True,
                    'data': {
                        'base': base_currency,
                        'target': target_currency,
                        'rate': rate,
                        'date': datetime.now().strftime('%Y-%m-%d'),
                        'timestamp': int(time.time())
                    },
                    'source': 'fallback',
                    'timestamp': datetime.now().isoformat(),
                    'warning': 'Using offline fallback data - rates may not be current'
                }
        
        # Try reverse lookup
        if target_currency in cls.FALLBACK_EXCHANGE_RATES:
            if base_currency in cls.FALLBACK_EXCHANGE_RATES[target_currency]:
                reverse_rate = cls.FALLBACK_EXCHANGE_RATES[target_currency][base_currency]
                rate = 1 / reverse_rate
                
                return {
                    'success': True,
                    'data': {
                        'base': base_currency,
                        'target': target_currency,
                        'rate': round(rate, 6),
                        'date': datetime.now().strftime('%Y-%m-%d'),
                        'timestamp': int(time.time())
                    },
                    'source': 'fallback_calculated',
                    'timestamp': datetime.now().isoformat(),
                    'warning': 'Using calculated fallback data - rates may not be current'
                }
        
        # No fallback data available
        return {
            'success': False,
            'error': f'Exchange rate not available for {base_currency} -> {target_currency}',
            'source': 'unavailable',
            'timestamp': datetime.now().isoformat()
        }
    
    @classmethod
    def get_multiple_exchange_rates(cls, base_currency: str, target_currencies: List[str]) -> Dict[str, Any]:
        """
        Get exchange rates for multiple target currencies at once
        
        Args:
            base_currency: Base currency code
            target_currencies: List of target currency codes
            
        Returns:
            Dict containing multiple exchange rates
        """
        results = {}
        errors = []
        
        for target_currency in target_currencies:
            try:
                rate_result = cls.get_exchange_rate(base_currency, target_currency)
                if rate_result['success']:
                    results[target_currency] = rate_result['data']
                else:
                    errors.append(f"{target_currency}: {rate_result.get('error', 'Unknown error')}")
            except Exception as e:
                errors.append(f"{target_currency}: {str(e)}")
        
        return {
            'success': len(results) > 0,
            'data': {
                'base': base_currency,
                'rates': results,
                'successful_conversions': len(results),
                'failed_conversions': len(errors)
            },
            'errors': errors if errors else None,
            'timestamp': datetime.now().isoformat()
        }
    
    @classmethod
    def convert_amount(cls, amount: float, from_currency: str, to_currency: str) -> Dict[str, Any]:
        """
        Convert amount from one currency to another
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code
            
        Returns:
            Dict containing conversion result
        """
        try:
            rate_result = cls.get_exchange_rate(from_currency, to_currency)
            
            if not rate_result['success']:
                return rate_result
            
            rate = rate_result['data']['rate']
            converted_amount = round(amount * rate, 2)
            
            return {
                'success': True,
                'data': {
                    'original_amount': amount,
                    'converted_amount': converted_amount,
                    'from_currency': from_currency,
                    'to_currency': to_currency,
                    'exchange_rate': rate,
                    'conversion_date': rate_result['data']['date']
                },
                'source': rate_result['source'],
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error converting amount: {e}")
            return {
                'success': False,
                'error': f'Currency conversion failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def clear_cache(cls) -> Dict[str, Any]:
        """Clear all currency-related cache entries"""
        try:
            # Clear countries cache
            cache.delete(cls.COUNTRIES_CACHE_KEY)
            
            # Clear exchange rate caches (we need to iterate through common currencies)
            common_currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'CHF']
            cleared_count = 0
            
            for currency in common_currencies:
                cache_key = cls.EXCHANGE_RATE_CACHE_KEY.format(base=currency)
                if cache.delete(cache_key):
                    cleared_count += 1
            
            return {
                'success': True,
                'message': f'Cleared currency cache (countries + {cleared_count} exchange rate caches)',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error clearing currency cache: {e}")
            return {
                'success': False,
                'error': f'Failed to clear cache: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }


# Convenience function for easy import
currency_service = CurrencyService()