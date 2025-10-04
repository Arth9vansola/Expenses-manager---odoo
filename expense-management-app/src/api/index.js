// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

// Remove auth token from localStorage
const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// API helper functions
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // Handle 401 unauthorized - redirect to login
    if (response.status === 401) {
      removeAuthToken();
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    let data;
    try {
      data = await response.json();
    } catch {
      // Handle non-JSON responses
      data = { message: response.statusText };
    }

    if (!response.ok) {
      throw new Error(data.message || data.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Secure API request (requires authentication)
export const secureApiRequest = async (endpoint, options = {}) => {
  return apiRequest(`/api/secure${endpoint}`, options);
};

// Public API request (no authentication required)
export const publicApiRequest = async (endpoint, options = {}) => {
  return apiRequest(`/api${endpoint}`, options);
};

// Authentication API calls
export const authAPI = {
  login: async (credentials) => {
    const response = await publicApiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },
  
  signup: async (userData) => {
    const response = await publicApiRequest('/auth/signup/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },
  
  logout: async () => {
    try {
      await publicApiRequest('/auth/logout/', {
        method: 'POST',
      });
    } finally {
      removeAuthToken();
    }
  },
  
  getCurrentUser: () => 
    secureApiRequest('/users/me/'),
    
  getAuthToken,
  setAuthToken,
  removeAuthToken,
};

// Countries and currencies API
export const countriesAPI = {
  getCountriesAndCurrencies: () => 
    publicApiRequest('/currencies/countries/'),
  
  getSupportedCurrencies: () =>
    publicApiRequest('/currencies/'),
};

// Exchange rate API
export const exchangeRateAPI = {
  getExchangeRates: (baseCurrency = 'USD') => 
    publicApiRequest(`/currencies/rates/?base=${baseCurrency}`),
  
  convertCurrency: (data) =>
    publicApiRequest('/currencies/convert/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Export auth helpers
export { getAuthToken, setAuthToken, removeAuthToken };

export default {
  apiRequest,
  secureApiRequest,
  publicApiRequest,
  authAPI,
  countriesAPI,
  exchangeRateAPI,
};