// Expense Management API with comprehensive integration and offline support
import offlineStorage from '../utils/offlineStorage';

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

// Enhanced currencies with more details
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

// Enhanced mock expense data with comprehensive fields
export const mockExpenses = [
  {
    id: '1',
    description: 'Business Lunch with Client',
    amount: 125.50,
    currency: 'USD',
    category: 'Meals',
    date: '2024-10-01',
    submittedBy: '3',
    submittedByName: 'John Employee',
    department: 'Sales',
    status: 'pending',
    receiptUrl: '/uploads/receipt1.jpg',
    notes: 'Client meeting at downtown restaurant',
    approvalChain: [
      { id: 'app1', approverId: '2', approverName: 'John Manager', status: 'pending', order: 1 },
      { id: 'app2', approverId: '5', approverName: 'Sarah Director', status: 'waiting', order: 2 }
    ],
    tags: ['client-meeting', 'urgent'],
    location: 'New York, NY',
    merchant: 'Downtown Bistro',
    receiptNumber: 'RCP-2024-001',
    paymentMethod: 'corporate_card',
    reimbursable: true,
    billable: true,
    projectCode: 'PROJ-2024-Q4',
    costCenter: 'SALES-001',
    createdAt: '2024-10-01T09:30:00Z',
    updatedAt: '2024-10-01T09:30:00Z',
    submissionDate: '2024-10-01T09:30:00Z'
  },
  {
    id: '2',
    description: 'Software License Renewal',
    amount: 299.99,
    currency: 'USD',
    category: 'Software',
    date: '2024-09-28',
    submittedBy: '3',
    submittedByName: 'John Employee',
    department: 'Engineering',
    status: 'approved',
    receiptUrl: '/uploads/receipt2.pdf',
    notes: 'Annual subscription for development tools',
    approvalChain: [
      { id: 'app3', approverId: '2', approverName: 'John Manager', status: 'approved', order: 1, approvedAt: '2024-09-29T10:15:00Z' }
    ],
    tags: ['software', 'development', 'subscription'],
    location: 'Remote',
    merchant: 'DevTools Inc',
    receiptNumber: 'INV-78432',
    paymentMethod: 'company_check',
    reimbursable: false,
    billable: false,
    projectCode: null,
    costCenter: 'ENG-001',
    createdAt: '2024-09-28T14:20:00Z',
    updatedAt: '2024-09-29T10:15:00Z',
    submissionDate: '2024-09-28T14:20:00Z'
  }
];

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
const isOnline = () => navigator.onLine;

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API !== 'false';

// HTTP Client with error handling
const apiClient = {
  async get(endpoint) {
    if (USE_MOCK_API || !isOnline()) {
      await delay(300);
      throw new Error('Mock API - using fallback data');
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  },

  async post(endpoint, data) {
    if (USE_MOCK_API || !isOnline()) {
      await delay(500);
      throw new Error('Mock API - using fallback data');
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  },

  async put(endpoint, data) {
    if (USE_MOCK_API || !isOnline()) {
      await delay(400);
      throw new Error('Mock API - using fallback data');
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('PUT request failed:', error);
      throw error;
    }
  },

  async delete(endpoint) {
    if (USE_MOCK_API || !isOnline()) {
      await delay(300);
      throw new Error('Mock API - using fallback data');
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  }
};

// Comprehensive Expense API with Offline Support
export const expenseAPI = {
  // Get all expenses with filters
  async getExpenses(filters = {}) {
    try {
      // Try to get from API first
      const data = await apiClient.get('/expenses?' + new URLSearchParams(filters));
      
      // Store in offline storage
      await offlineStorage.setData('expenses', data);
      
      return data;
    } catch (error) {
      console.warn('Failed to fetch expenses from API, using offline data:', error);
      
      // Get from offline storage
      const cached = await offlineStorage.getData('expenses', mockExpenses);
      
      // Apply filters to cached data
      let filteredExpenses = [...cached];
      
      if (filters.status) {
        filteredExpenses = filteredExpenses.filter(e => e.status === filters.status);
      }
      if (filters.category) {
        filteredExpenses = filteredExpenses.filter(e => e.category === filters.category);
      }
      if (filters.submittedBy) {
        filteredExpenses = filteredExpenses.filter(e => e.submittedBy === filters.submittedBy);
      }
      
      return filteredExpenses;
    }
  },

  // Get expense by ID
  async getExpenseById(id) {
    try {
      const data = await apiClient.get(`/expenses/${id}`);
      
      // Update in offline storage
      const expenses = await offlineStorage.getData('expenses', []);
      const index = expenses.findIndex(e => e.id === id);
      if (index >= 0) {
        expenses[index] = data;
        await offlineStorage.setData('expenses', expenses);
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to fetch expense from API, using offline data:', error);
      
      const cached = await offlineStorage.getData('expenses', mockExpenses);
      const expense = cached.find(e => e.id === id);
      
      if (!expense) {
        throw new Error('Expense not found');
      }
      
      return expense;
    }
  },

  // Create new expense
  async createExpense(expenseData) {
    const expenseWithId = {
      ...expenseData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    try {
      // Try to create via API
      const data = await apiClient.post('/expenses', expenseWithId);
      
      // Store in offline storage
      const expenses = await offlineStorage.getData('expenses', []);
      expenses.unshift(data);
      await offlineStorage.setData('expenses', expenses);
      
      return data;
    } catch (error) {
      console.warn('Failed to create expense via API, storing offline:', error);
      
      // Store offline with sync flag
      const expenses = await offlineStorage.getData('expenses', []);
      expenses.unshift(expenseWithId);
      await offlineStorage.setData('expenses', expenses);
      
      // Add to sync queue
      await offlineStorage.addToSyncQueue('CREATE_EXPENSE', expenseWithId);
      
      return expenseWithId;
    }
  },

  // Update expense
  async updateExpense(id, expenseData) {
    const updatedExpense = {
      ...expenseData,
      id,
      updatedAt: new Date().toISOString()
    };

    try {
      // Try to update via API
      const data = await apiClient.put(`/expenses/${id}`, updatedExpense);
      
      // Update in offline storage
      const expenses = await offlineStorage.getData('expenses', []);
      const index = expenses.findIndex(e => e.id === id);
      if (index >= 0) {
        expenses[index] = data;
        await offlineStorage.setData('expenses', expenses);
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to update expense via API, storing offline:', error);
      
      // Update offline storage
      const expenses = await offlineStorage.getData('expenses', []);
      const index = expenses.findIndex(e => e.id === id);
      if (index >= 0) {
        expenses[index] = updatedExpense;
        await offlineStorage.setData('expenses', expenses);
        
        // Add to sync queue
        await offlineStorage.addToSyncQueue('UPDATE_EXPENSE', updatedExpense);
        
        return updatedExpense;
      } else {
        throw new Error('Expense not found');
      }
    }
  },

  // Delete expense
  async deleteExpense(id) {
    try {
      // Try to delete via API
      await apiClient.delete(`/expenses/${id}`);
      
      // Remove from offline storage
      const expenses = await offlineStorage.getData('expenses', []);
      const filteredExpenses = expenses.filter(e => e.id !== id);
      await offlineStorage.setData('expenses', filteredExpenses);
      
      return { success: true };
    } catch (error) {
      console.warn('Failed to delete expense via API, marking for sync:', error);
      
      // Mark as deleted in offline storage
      const expenses = await offlineStorage.getData('expenses', []);
      const expense = expenses.find(e => e.id === id);
      
      if (expense) {
        // Add to sync queue for deletion
        await offlineStorage.addToSyncQueue('DELETE_EXPENSE', { id });
        
        // Remove from local storage immediately
        const filteredExpenses = expenses.filter(e => e.id !== id);
        await offlineStorage.setData('expenses', filteredExpenses);
        
        return { success: true };
      } else {
        throw new Error('Expense not found');
      }
    }
  },

  // Upload receipt
  async uploadReceipt(file, expenseId = null) {
    try {
      // Simulate upload for offline mode
      const uploadResult = {
        success: true,
        url: URL.createObjectURL(file),
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      // Store image in offline storage
      if (expenseId) {
        await offlineStorage.cacheImage(`receipt-${expenseId}`, uploadResult.url);
      }

      return uploadResult;
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error('Failed to upload receipt');
    }
  },

  // Get expense statistics
  async getExpenseStats(filters = {}) {
    try {
      const expenses = await this.getExpenses(filters);
      
      const stats = {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0),
        byStatus: {
          pending: expenses.filter(e => e.status === 'pending').length,
          approved: expenses.filter(e => e.status === 'approved').length,
          rejected: expenses.filter(e => e.status === 'rejected').length
        },
        byCategory: {}
      };

      // Group by category
      expenses.forEach(expense => {
        const category = expense.category || 'Other';
        if (!stats.byCategory[category]) {
          stats.byCategory[category] = 0;
        }
        stats.byCategory[category] += parseFloat(expense.amount || 0);
      });

      return stats;
    } catch (error) {
      console.error('Failed to get expense statistics:', error);
      return {
        totalExpenses: 0,
        totalAmount: 0,
        byStatus: { pending: 0, approved: 0, rejected: 0 },
        byCategory: {}
      };
    }
  }
};

// Get expense status color based on status
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return '#10b981'; // green
    case 'pending':
      return '#f59e0b'; // amber
    case 'rejected':
      return '#ef4444'; // red
    case 'draft':
      return '#6b7280'; // gray
    default:
      return '#6b7280'; // gray
  }
};

// Cache manager for backward compatibility
export const expenseCacheManager = {
  clearCache: async () => {
    await offlineStorage.clearAll();
  },
  
  getCache: () => ({}),
  isOnline: isOnline,
  
  syncWhenOnline: async () => {
    if (isOnline()) {
      try {
        await offlineStorage.syncWhenOnline();
        return true;
      } catch (error) {
        console.warn('Failed to sync expenses when online:', error);
        return false;
      }
    }
    return false;
  }
};

// Utility function for date formatting
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Re-export formatCurrency for backward compatibility
export { formatCurrency } from '../utils/currency';