// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Country and Currency API
export const COUNTRIES_API = 'https://restcountries.com/v3.1/all?fields=name,currencies';
export const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';

// API helper functions
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication API calls
export const authAPI = {
  login: (credentials) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  signup: (userData) => 
    apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  
  logout: () => 
    apiRequest('/auth/logout', {
      method: 'POST',
    }),
};

// Countries and currencies API
export const countriesAPI = {
  getCountriesAndCurrencies: async () => {
    try {
      const response = await fetch(COUNTRIES_API);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    }
  },
};

// Exchange rate API
export const exchangeRateAPI = {
  getExchangeRates: async (baseCurrency = 'USD') => {
    try {
      const response = await fetch(`${EXCHANGE_RATE_API}/${baseCurrency}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw error;
    }
  },
};

export default {
  apiRequest,
  authAPI,
  countriesAPI,
  exchangeRateAPI,
};