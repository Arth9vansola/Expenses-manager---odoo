// Countries and Currencies API with real endpoint integration
// Comprehensive utility for country data, currency information, and exchange rates

// Mock country/currency data as fallback
const mockCountries = [
  {
    name: { common: 'United States', official: 'United States of America' },
    cca2: 'US',
    cca3: 'USA',
    currencies: { USD: { name: 'United States dollar', symbol: '$' } },
    flag: '🇺🇸'
  },
  {
    name: { common: 'United Kingdom', official: 'United Kingdom of Great Britain and Northern Ireland' },
    cca2: 'GB',
    cca3: 'GBR',
    currencies: { GBP: { name: 'British pound', symbol: '£' } },
    flag: '🇬🇧'
  },
  {
    name: { common: 'Canada', official: 'Canada' },
    cca2: 'CA',
    cca3: 'CAN',
    currencies: { CAD: { name: 'Canadian dollar', symbol: 'C$' } },
    flag: '🇨🇦'
  },
  {
    name: { common: 'Germany', official: 'Federal Republic of Germany' },
    cca2: 'DE',
    cca3: 'DEU',
    currencies: { EUR: { name: 'Euro', symbol: '€' } },
    flag: '🇩🇪'
  },
  {
    name: { common: 'France', official: 'French Republic' },
    cca2: 'FR',
    cca3: 'FRA',
    currencies: { EUR: { name: 'Euro', symbol: '€' } },
    flag: '🇫🇷'
  },
  {
    name: { common: 'Japan', official: 'Japan' },
    cca2: 'JP',
    cca3: 'JPN',
    currencies: { JPY: { name: 'Japanese yen', symbol: '¥' } },
    flag: '🇯🇵'
  },
  {
    name: { common: 'Australia', official: 'Commonwealth of Australia' },
    cca2: 'AU',
    cca3: 'AUS',
    currencies: { AUD: { name: 'Australian dollar', symbol: 'A$' } },
    flag: '🇦🇺'
  },
  {
    name: { common: 'India', official: 'Republic of India' },
    cca2: 'IN',
    cca3: 'IND',
    currencies: { INR: { name: 'Indian rupee', symbol: '₹' } },
    flag: '🇮🇳'
  },
  {
    name: { common: 'China', official: 'People\'s Republic of China' },
    cca2: 'CN',
    cca3: 'CHN',
    currencies: { CNY: { name: 'Chinese yuan', symbol: '¥' } },
    flag: '🇨🇳'
  },
  {
    name: { common: 'Brazil', official: 'Federative Republic of Brazil' },
    cca2: 'BR',
    cca3: 'BRA',
    currencies: { BRL: { name: 'Brazilian real', symbol: 'R$' } },
    flag: '🇧🇷'
  }
];

// Mock exchange rates (fallback data)
const mockExchangeRates = {
  base: 'USD',
  date: '2024-10-01',
  rates: {
    USD: 1.00,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110.25,
    CAD: 1.25,
    AUD: 1.35,
    INR: 74.50,
    CNY: 6.45,
    BRL: 5.20,
    CHF: 0.92,
    SEK: 8.65,
    NOK: 8.95,
    DKK: 6.35,
    PLN: 3.85,
    CZK: 22.15,
    HUF: 295.50,
    RUB: 75.00,
    SGD: 1.35,
    HKD: 7.80,
    KRW: 1180.00,
    MXN: 20.15,
    ZAR: 14.25,
    THB: 32.50,
    TRY: 8.45,
    AED: 3.67,
    SAR: 3.75
  }
};

// Cache for offline functionality
let countriesCache = {
  countries: [...mockCountries],
  currencies: {},
  exchangeRates: { ...mockExchangeRates },
  lastUpdated: new Date().toISOString()
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isOnline = () => navigator.onLine;

// Cache management
const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`countries_cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Failed to get cached countries data:', error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(`countries_cache_${key}`, JSON.stringify(data));
    localStorage.setItem(`countries_cache_${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.warn('Failed to cache countries data:', error);
  }
};

const isCacheValid = (key, maxAge = 24 * 60 * 60 * 1000) => { // 24 hours default
  try {
    const timestamp = localStorage.getItem(`countries_cache_${key}_timestamp`);
    if (!timestamp) return false;
    
    const age = Date.now() - parseInt(timestamp);
    return age < maxAge;
  } catch (error) {
    return false;
  }
};

// API Configuration
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API !== 'false';
const REST_COUNTRIES_API = 'https://restcountries.com/v3.1';
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';

// HTTP Client with error handling
const apiClient = {
  async get(url, timeout = 10000) {
    if (USE_MOCK_API || !isOnline()) {
      await delay(300);
      throw new Error('Mock API - using fallback data');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ExpenseApp/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      console.error('API request failed:', error);
      throw error;
    }
  }
};

// Countries and Currencies API
export const countriesAPI = {
  // Get all countries with currency information
  async getCountries() {
    try {
      // Check cache first
      if (isCacheValid('countries')) {
        const cached = getCachedData('countries');
        if (cached) {
          return cached;
        }
      }

      // Fetch from REST Countries API
      const data = await apiClient.get(`${REST_COUNTRIES_API}/all?fields=name,cca2,cca3,currencies,flag`);
      
      // Process and normalize data
      const processedCountries = data.map(country => ({
        name: country.name,
        code: country.cca2,
        code3: country.cca3,
        currencies: country.currencies || {},
        flag: country.flag || ''
      }));

      // Cache the data
      setCachedData('countries', processedCountries);
      countriesCache.countries = processedCountries;
      
      return processedCountries;
    } catch (error) {
      console.warn('Failed to fetch countries from API, using cached data:', error);
      
      // Fallback to cached data or mock data
      const cached = getCachedData('countries');
      if (cached) {
        return cached;
      }
      
      return mockCountries;
    }
  },

  // Get currency format information
  getCurrencyFormat(currencyCode) {
    const formats = {
      'USD': { symbol: '$', position: 'before', decimals: 2 },
      'EUR': { symbol: '€', position: 'after', decimals: 2 },
      'GBP': { symbol: '£', position: 'before', decimals: 2 },
      'JPY': { symbol: '¥', position: 'before', decimals: 0 },
      'CAD': { symbol: 'C$', position: 'before', decimals: 2 },
      'AUD': { symbol: 'A$', position: 'before', decimals: 2 },
      'INR': { symbol: '₹', position: 'before', decimals: 2 },
      'CNY': { symbol: '¥', position: 'before', decimals: 2 },
      'BRL': { symbol: 'R$', position: 'before', decimals: 2 },
      'CHF': { symbol: 'CHF', position: 'after', decimals: 2 }
    };
    
    return formats[currencyCode] || { 
      symbol: currencyCode, 
      position: 'before', 
      decimals: 2 
    };
  },

  // Format currency amount
  formatCurrency(amount, currencyCode, locale = 'en-US') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const format = this.getCurrencyFormat(currencyCode);
      const formattedAmount = amount.toFixed(format.decimals);
      
      return format.position === 'before' 
        ? `${format.symbol}${formattedAmount}`
        : `${formattedAmount} ${format.symbol}`;
    }
  }
};

// Legacy functions for backward compatibility
export const fetchCountries = async () => {
  try {
    const countries = await countriesAPI.getCountries();
    return countries.map(country => ({
      code: country.code,
      name: country.name.common || country.name,
      currencies: country.currencies || {}
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw new Error('Failed to load countries');
  }
};

export const getCountryCurrency = (countries, countryCode) => {
  const country = countries.find(c => c.code === countryCode);
  if (!country || !country.currencies) return null;
  
  const currencyCode = Object.keys(country.currencies)[0];
  const currency = country.currencies[currencyCode];
  
  return {
    code: currencyCode,
    name: currency?.name || currencyCode
  };
};

// Export for backward compatibility
export { mockCountries, mockExchangeRates };
export default countriesAPI;