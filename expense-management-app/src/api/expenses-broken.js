// Expense Management API with comprehensive integration and offline support
import React from 'react';
import { formatCurrency } from '../utils/currency';
import { offlineStorage } from '../utils/offlineStorage';

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
    createdAt: '2024-10-01T09:30:00Z',
    updatedAt: '2024-10-01T09:30:00Z',
    mileage: null,
    project: 'Q4 Sales Campaign'
  },
  {
    id: '2',
    description: 'Uber to Airport',
    amount: 45.75,
    currency: 'USD',
    category: 'Travel',
    date: '2024-09-28',
    submittedBy: '4',
    submittedByName: 'Jane Employee',
    department: 'Marketing',
    status: 'approved',
    receiptUrl: '/uploads/receipt2.jpg',
    notes: 'Travel for conference',
    approvalChain: [
      { id: 'app3', approverId: '2', approverName: 'John Manager', status: 'approved', order: 1, approvedAt: '2024-09-29T10:15:00Z' }
    ],
    tags: ['travel', 'conference'],
    location: 'San Francisco, CA',
    createdAt: '2024-09-28T14:20:00Z',
    updatedAt: '2024-09-29T10:15:00Z',
    mileage: 15.2,
    project: 'Tech Conference 2024'
  },
  {
    id: '3',
    description: 'Office Supplies - Notebooks and Pens',
    amount: 89.99,
    currency: 'USD',
    category: 'Office Supplies',
    date: '2024-09-30',
    submittedBy: '3',
    submittedByName: 'John Employee',
    department: 'Engineering',
    status: 'rejected',
    receiptUrl: '/uploads/receipt3.jpg',
    notes: 'Quarterly office supply restock',
    approvalChain: [
      { id: 'app4', approverId: '2', approverName: 'John Manager', status: 'rejected', order: 1, rejectedAt: '2024-10-01T11:00:00Z', rejectionReason: 'Exceeds monthly office supply budget' }
    ],
    tags: ['office', 'supplies'],
    location: 'Office',
    createdAt: '2024-09-30T16:45:00Z',
    updatedAt: '2024-10-01T11:00:00Z',
    mileage: null,
    project: null
  }
];

// Cache for offline functionality
let expenseCache = {
  expenses: [...mockExpenses],
  lastUpdated: new Date().toISOString(),
  categories: expenseCategories.map(c => c.name),
  currencies: currencies.map(c => c.code)
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
const isOnline = () => navigator.onLine;

// Cache management
const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`expense_cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Failed to get cached data:', error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(`expense_cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
};

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
      
      // Update in-memory cache
      const memIndex = mockExpenses.findIndex(e => e.id === id);
      if (memIndex !== -1) {
        mockExpenses[memIndex] = updatedExpense;
      }
      
      return updatedExpense;
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
      const formData = new FormData();
      formData.append('receipt', file);
      if (expenseId) {
        formData.append('expenseId', expenseId);
      }

      // Simulate upload for offline mode
      const uploadResult = {
        success: true,
        url: URL.createObjectURL(file),
        filename: file.name,
        size: file.size
      };

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
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to upload receipt via API, using mock URL:', error);
      
      // Return mock upload result
      return {
        url: `/uploads/mock_${Date.now()}_${file.name}`,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };
    }
  },

  // Process receipt with OCR
  async processReceiptOCR(file) {
    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await fetch(`${API_BASE_URL}/expenses/ocr-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`OCR processing failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to process OCR via API, using mock data:', error);
      
      // Return mock OCR result
      await delay(2000);
      
      return {
        amount: Math.floor(Math.random() * 200) + 10,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        merchant: 'Mock Restaurant',
        category: 'Meals',
        confidence: 0.85,
        extractedText: 'RECEIPT\nMock Restaurant\nTotal: $XX.XX\nDate: ' + new Date().toLocaleDateString()
      };
    }
  },

  // Get expense statistics
  async getExpenseStats(filters = {}) {
    try {
      return await apiClient.get('/expenses/stats?' + new URLSearchParams(filters));
    } catch (error) {
      console.warn('Failed to fetch stats from API, calculating from cached data:', error);
      const expenses = getCachedData('expenses') || mockExpenses;
      
      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
      const approvedExpenses = expenses.filter(e => e.status === 'approved').length;
      const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
      const rejectedExpenses = expenses.filter(e => e.status === 'rejected').length;
      
      const categoryBreakdown = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});
      
      return {
        totalExpenses,
        totalAmount,
        averageAmount: totalExpenses > 0 ? totalAmount / totalExpenses : 0,
        approvedExpenses,
        pendingExpenses,
        rejectedExpenses,
        categoryBreakdown,
        currency: 'USD'
      };
    }
  }
};

// Utility functions
export const getStatusColor = (status) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'danger';
    case 'draft': return 'secondary';
    default: return 'secondary';
  }
};

// Re-export formatCurrency for backward compatibility
export { formatCurrency } from '../utils/currency';

// Cache manager
export const expenseCacheManager = {
  clearCache: () => {
    localStorage.removeItem('expense_cache_expenses');
    expenseCache = {
      expenses: [...mockExpenses],
      lastUpdated: new Date().toISOString(),
      categories: expenseCategories.map(c => c.name),
      currencies: currencies.map(c => c.code)
    };
  },
  
  getCache: () => expenseCache,
  isOnline: isOnline,
  
  syncWhenOnline: async () => {
    if (isOnline()) {
      try {
        const freshData = await expenseAPI.getExpenses();
        setCachedData('expenses', freshData);
        return freshData;
      } catch (error) {
        console.warn('Failed to sync expenses when online:', error);
        return null;
      }
    }
    return null;
  }
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};