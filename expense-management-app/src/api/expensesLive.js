import { secureApiRequest } from './index';

// Individual function exports
export const getAllExpenses = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  if (filters.owner) queryParams.append('owner', filters.owner);
  
  const endpoint = `/expenses/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return secureApiRequest(endpoint);
};

export const getUserExpenses = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.category) queryParams.append('category', filters.category);
  if (filters.start_date) queryParams.append('start_date', filters.start_date);
  if (filters.end_date) queryParams.append('end_date', filters.end_date);
  
  return secureApiRequest(`/expenses/my/?${queryParams.toString()}`);
};

export const createExpense = async (expenseData) => {
  const formData = new FormData();
  
  Object.keys(expenseData).forEach(key => {
    if (expenseData[key] !== null && expenseData[key] !== undefined) {
      if (key === 'receiptFile' && expenseData[key] instanceof File) {
        formData.append('receipt', expenseData[key]);
      } else {
        formData.append(key, expenseData[key]);
      }
    }
  });
  
  return secureApiRequest('/expenses/', {
    method: 'POST',
    headers: {}, // Remove Content-Type to let browser set multipart boundary
    body: formData,
  });
};

export const updateExpense = async (expenseId, expenseData) => {
  const formData = new FormData();
  
  Object.keys(expenseData).forEach(key => {
    if (expenseData[key] !== null && expenseData[key] !== undefined) {
      if (key === 'receiptFile' && expenseData[key] instanceof File) {
        formData.append('receipt', expenseData[key]);
      } else {
        formData.append(key, expenseData[key]);
      }
    }
  });
  
  return secureApiRequest(`/expenses/${expenseId}/`, {
    method: 'PUT',
    headers: {},
    body: formData,
  });
};

export const deleteExpense = (expenseId) =>
  secureApiRequest(`/expenses/${expenseId}/`, {
    method: 'DELETE',
  });

export const submitExpense = (expenseId) =>
  secureApiRequest(`/expenses/${expenseId}/submit/`, {
    method: 'POST',
  });

export const approveExpense = (expenseId, comment = '') =>
  secureApiRequest(`/expenses/${expenseId}/approve/`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });

export const rejectExpense = (expenseId, comment = '') =>
  secureApiRequest(`/expenses/${expenseId}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });

// Utility functions for expenses
export const formatCurrency = (amount, currencyCode = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatter.format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getStatusColor = (status) => {
  const statusColors = {
    'draft': '#666666',
    'submitted': '#2196F3',
    'pending': '#FF9800',
    'approved': '#4CAF50',
    'rejected': '#F44336',
    'paid': '#9C27B0'
  };
  return statusColors[status] || '#666666';
};

// Mock expense categories
export const expenseCategories = [
  { id: 1, name: 'Travel', description: 'Flights, hotels, taxis, parking' },
  { id: 2, name: 'Meals', description: 'Business meals, client entertainment' },
  { id: 3, name: 'Office Supplies', description: 'Stationery, equipment, software' },
  { id: 4, name: 'Software', description: 'Software licenses, subscriptions' },
  { id: 5, name: 'Training', description: 'Courses, conferences, books' },
  { id: 6, name: 'Marketing', description: 'Advertising, promotions, events' },
  { id: 7, name: 'Equipment', description: 'Hardware, tools, machinery' },
  { id: 8, name: 'Entertainment', description: 'Client entertainment, team events' },
  { id: 9, name: 'Utilities', description: 'Electricity, water, gas, internet' },
  { id: 10, name: 'Other', description: 'Miscellaneous business expenses' }
];

// Enhanced currencies
export const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' },
  { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', country: 'China' }
];

// API object for backward compatibility
export const expensesAPI = {
  getAllExpenses,
  getUserExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  
  // Additional methods
  getExpense: (expenseId) =>
    secureApiRequest(`/expenses/${expenseId}/`),

  getApprovalHistory: (expenseId) =>
    secureApiRequest(`/expenses/${expenseId}/approvals/`),

  addComment: (expenseId, comment) =>
    secureApiRequest(`/expenses/${expenseId}/comments/`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  getComments: (expenseId) =>
    secureApiRequest(`/expenses/${expenseId}/comments/`),

  exportExpenses: (filters = {}, format = 'csv') => {
    const queryParams = new URLSearchParams(filters);
    queryParams.append('format', format);
    
    return secureApiRequest(`/expenses/export/?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv',
      },
    });
  },

  getAnalytics: (filters = {}) => {
    const queryParams = new URLSearchParams(filters);
    return secureApiRequest(`/expenses/analytics/?${queryParams.toString()}`);
  },

  bulkApprove: (expenseIds, comment = '') =>
    secureApiRequest('/expenses/bulk-approve/', {
      method: 'POST',
      body: JSON.stringify({ expense_ids: expenseIds, comment }),
    }),

  bulkReject: (expenseIds, comment = '') =>
    secureApiRequest('/expenses/bulk-reject/', {
      method: 'POST',
      body: JSON.stringify({ expense_ids: expenseIds, comment }),
    }),
};

export default expensesAPI;