// User Management API with comprehensive integration
import { countries, currencies } from './countries';

// Enhanced mock user data
export const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'admin',
    department: 'Administration',
    managerId: null,
    managerName: null,
    status: 'active',
    avatar: '/avatars/admin.jpg',
    phone: '+1-555-0101',
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    joinedAt: '2023-01-15T08:00:00Z',
    lastLoginAt: '2024-10-04T09:30:00Z',
    permissions: ['manage_users', 'manage_expenses', 'view_reports', 'system_admin'],
    settings: {
      notifications: {
        email: true,
        push: true,
        frequency: 'immediate'
      },
      preferences: {
        theme: 'light',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: 'US'
      }
    }
  },
  {
    id: '2',
    name: 'John Manager',
    email: 'john.manager@company.com',
    role: 'manager',
    department: 'Sales',
    managerId: '1',
    managerName: 'Admin User',
    status: 'active',
    avatar: '/avatars/john.jpg',
    phone: '+1-555-0202',
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    joinedAt: '2023-02-20T08:00:00Z',
    lastLoginAt: '2024-10-04T08:45:00Z',
    permissions: ['approve_expenses', 'view_team_expenses', 'manage_team'],
    teamSize: 5,
    settings: {
      notifications: {
        email: true,
        push: false,
        frequency: 'daily'
      },
      preferences: {
        theme: 'dark',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'US'
      }
    }
  },
  {
    id: '3',
    name: 'John Employee',
    email: 'john.employee@company.com',
    role: 'employee',
    department: 'Engineering',
    managerId: '2',
    managerName: 'John Manager',
    status: 'active',
    avatar: '/avatars/john-emp.jpg',
    phone: '+1-555-0303',
    country: 'US',
    currency: 'USD',
    timezone: 'America/Los_Angeles',
    joinedAt: '2023-03-10T08:00:00Z',
    lastLoginAt: '2024-10-04T07:20:00Z',
    permissions: ['submit_expenses', 'view_own_expenses'],
    expenseLimit: 1000,
    settings: {
      notifications: {
        email: true,
        push: true,
        frequency: 'weekly'
      },
      preferences: {
        theme: 'auto',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: 'US'
      }
    }
  },
  {
    id: '4',
    name: 'Jane Employee',
    email: 'jane.employee@company.com',
    role: 'employee',
    department: 'Marketing',
    managerId: '2',
    managerName: 'John Manager',
    status: 'active',
    avatar: '/avatars/jane.jpg',
    phone: '+1-555-0404',
    country: 'CA',
    currency: 'CAD',
    timezone: 'America/Toronto',
    joinedAt: '2023-04-05T08:00:00Z',
    lastLoginAt: '2024-10-03T16:45:00Z',
    permissions: ['submit_expenses', 'view_own_expenses'],
    expenseLimit: 500,
    settings: {
      notifications: {
        email: false,
        push: true,
        frequency: 'immediate'
      },
      preferences: {
        theme: 'light',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'CA'
      }
    }
  },
  {
    id: '5',
    name: 'Sarah Director',
    email: 'sarah.director@company.com',
    role: 'manager',
    department: 'Finance',
    managerId: '1',
    managerName: 'Admin User',
    status: 'active',
    avatar: '/avatars/sarah.jpg',
    phone: '+1-555-0505',
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    joinedAt: '2022-11-15T08:00:00Z',
    lastLoginAt: '2024-10-04T10:15:00Z',
    permissions: ['approve_expenses', 'view_all_expenses', 'financial_reports', 'budget_management'],
    teamSize: 8,
    settings: {
      notifications: {
        email: true,
        push: true,
        frequency: 'immediate'
      },
      preferences: {
        theme: 'light',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        numberFormat: 'US'
      }
    }
  }
];

// Cache for offline functionality
let userCache = {
  users: [...mockUsers],
  lastUpdated: new Date().toISOString(),
  departments: ['Administration', 'Sales', 'Engineering', 'Marketing', 'Finance', 'HR', 'Operations'],
  roles: ['admin', 'manager', 'employee']
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
const isOnline = () => navigator.onLine;

// Cache management
const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`user_cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Failed to get cached user data:', error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(`user_cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache user data:', error);
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

// Comprehensive User API
export const userAPI = {
  // Get all users with filters
  async getUsers(filters = {}) {
    try {
      const data = await apiClient.get('/users?' + new URLSearchParams(filters));
      setCachedData('users', data);
      return data;
    } catch (error) {
      console.warn('Failed to fetch users from API, using cached data:', error);
      const cached = getCachedData('users') || mockUsers;
      
      // Apply filters to cached data
      let filteredUsers = [...cached];
      
      if (filters.role) {
        filteredUsers = filteredUsers.filter(u => u.role === filters.role);
      }
      if (filters.department) {
        filteredUsers = filteredUsers.filter(u => u.department === filters.department);
      }
      if (filters.status) {
        filteredUsers = filteredUsers.filter(u => u.status === filters.status);
      }
      if (filters.managerId) {
        filteredUsers = filteredUsers.filter(u => u.managerId === filters.managerId);
      }
      
      return filteredUsers;
    }
  },

  // Get user by ID
  async getUserById(id) {
    try {
      return await apiClient.get(`/users/${id}`);
    } catch (error) {
      console.warn('Failed to fetch user from API, using cached data:', error);
      const cached = getCachedData('users') || mockUsers;
      const user = cached.find(u => u.id === id);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    }
  },

  // Create new user
  async createUser(userData) {
    try {
      const data = await apiClient.post('/users', userData);
      
      // Update local cache
      const cached = getCachedData('users') || mockUsers;
      cached.push(data);
      setCachedData('users', cached);
      
      return data;
    } catch (error) {
      console.warn('Failed to create user via API, using mock data:', error);
      
      // Create mock user
      const newUser = {
        ...userData,
        id: generateId(),
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastLoginAt: null,
        permissions: getUserPermissionsByRole(userData.role),
        settings: getDefaultUserSettings()
      };
      
      // Update caches
      const cached = getCachedData('users') || mockUsers;
      cached.push(newUser);
      setCachedData('users', cached);
      mockUsers.push(newUser);
      
      return newUser;
    }
  },

  // Update user
  async updateUser(id, userData) {
    try {
      const data = await apiClient.put(`/users/${id}`, userData);
      
      // Update local cache
      const cached = getCachedData('users') || mockUsers;
      const index = cached.findIndex(u => u.id === id);
      if (index !== -1) {
        cached[index] = { ...cached[index], ...data };
        setCachedData('users', cached);
      }
      
      return cached[index];
    } catch (error) {
      console.warn('Failed to update user via API, using mock data:', error);
      
      // Update mock user
      const cached = getCachedData('users') || mockUsers;
      const index = cached.findIndex(u => u.id === id);
      
      if (index === -1) {
        throw new Error('User not found');
      }
      
      const updatedUser = {
        ...cached[index],
        ...userData
      };
      
      cached[index] = updatedUser;
      setCachedData('users', cached);
      
      // Update in-memory cache
      const memIndex = mockUsers.findIndex(u => u.id === id);
      if (memIndex !== -1) {
        mockUsers[memIndex] = updatedUser;
      }
      
      return updatedUser;
    }
  },

  // Delete user
  async deleteUser(id) {
    try {
      await apiClient.delete(`/users/${id}`);
      
      // Update local cache
      const cached = getCachedData('users') || mockUsers;
      const filteredCache = cached.filter(u => u.id !== id);
      setCachedData('users', filteredCache);
      
      return { success: true };
    } catch (error) {
      console.warn('Failed to delete user via API, using mock data:', error);
      
      // Remove from mock data
      const cached = getCachedData('users') || mockUsers;
      const filteredCache = cached.filter(u => u.id !== id);
      setCachedData('users', filteredCache);
      
      // Update in-memory cache
      const index = mockUsers.findIndex(u => u.id === id);
      if (index !== -1) {
        mockUsers.splice(index, 1);
      }
      
      return { success: true };
    }
  },

  // User authentication
  async login(email, password) {
    try {
      const data = await apiClient.post('/auth/login', { email, password });
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('current_user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      console.warn('Failed to login via API, using mock authentication:', error);
      
      // Mock authentication
      await delay(800);
      
      const user = mockUsers.find(u => u.email === email);
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Mock password validation (in real app, never store passwords in frontend)
      if (password !== 'password123') {
        throw new Error('Invalid email or password');
      }
      
      const mockToken = `mock_token_${Date.now()}_${user.id}`;
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('current_user', JSON.stringify(user));
      
      return {
        user,
        token: mockToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
    }
  },

  // User registration
  async register(userData) {
    try {
      const data = await apiClient.post('/auth/register', userData);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('current_user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      console.warn('Failed to register via API, using mock registration:', error);
      
      // Mock registration
      await delay(1000);
      
      // Check if user already exists
      const existingUser = mockUsers.find(u => u.email === userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      const newUser = {
        ...userData,
        id: generateId(),
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        permissions: getUserPermissionsByRole(userData.role),
        settings: getDefaultUserSettings()
      };
      
      mockUsers.push(newUser);
      setCachedData('users', mockUsers);
      
      const mockToken = `mock_token_${Date.now()}_${newUser.id}`;
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('current_user', JSON.stringify(newUser));
      
      return {
        user: newUser,
        token: mockToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }
  },

  // Logout
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Failed to logout via API, clearing local data:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
  },

  // Get current user
  getCurrentUser() {
    try {
      const userData = localStorage.getItem('current_user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get current user from localStorage:', error);
      return null;
    }
  },

  // Update user profile
  async updateProfile(userData) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    return this.updateUser(currentUser.id, userData);
  },

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      return await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error) {
      console.warn('Failed to change password via API, using mock:', error);
      await delay(500);
      
      // Mock password change
      if (currentPassword !== 'password123') {
        throw new Error('Current password is incorrect');
      }
      
      return { success: true, message: 'Password changed successfully' };
    }
  },

  // Send user invitation
  async sendInvitation(email, role, managerId = null) {
    try {
      return await apiClient.post('/users/invite', { email, role, managerId });
    } catch (error) {
      console.warn('Failed to send invitation via API, using mock:', error);
      await delay(800);
      
      // Mock invitation
      return {
        success: true,
        message: `Invitation sent to ${email}`,
        invitationId: generateId(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
    }
  },

  // Get user statistics
  async getUserStats() {
    try {
      return await apiClient.get('/users/stats');
    } catch (error) {
      console.warn('Failed to fetch user stats from API, calculating from cached data:', error);
      const users = getCachedData('users') || mockUsers;
      
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const adminCount = users.filter(u => u.role === 'admin').length;
      const managerCount = users.filter(u => u.role === 'manager').length;
      const employeeCount = users.filter(u => u.role === 'employee').length;
      
      const departmentBreakdown = users.reduce((acc, u) => {
        acc[u.department] = (acc[u.department] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminCount,
        managerCount,
        employeeCount,
        departmentBreakdown,
        averageTeamSize: managerCount > 0 ? Math.round(employeeCount / managerCount) : 0
      };
    }
  },

  // Get departments
  async getDepartments() {
    try {
      return await apiClient.get('/users/departments');
    } catch (error) {
      console.warn('Failed to fetch departments from API, using cached data:', error);
      return getCachedData('departments') || userCache.departments;
    }
  },

  // Get user roles
  async getRoles() {
    try {
      return await apiClient.get('/users/roles');
    } catch (error) {
      console.warn('Failed to fetch roles from API, using cached data:', error);
      return getCachedData('roles') || userCache.roles;
    }
  }
};

// Helper functions
const getUserPermissionsByRole = (role) => {
  const permissions = {
    admin: ['manage_users', 'manage_expenses', 'view_reports', 'system_admin', 'approve_expenses'],
    manager: ['approve_expenses', 'view_team_expenses', 'manage_team', 'view_reports'],
    employee: ['submit_expenses', 'view_own_expenses']
  };
  
  return permissions[role] || permissions.employee;
};

const getDefaultUserSettings = () => ({
  notifications: {
    email: true,
    push: true,
    frequency: 'daily'
  },
  preferences: {
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'US'
  }
});

// Cache manager
export const userCacheManager = {
  clearCache: () => {
    localStorage.removeItem('user_cache_users');
    localStorage.removeItem('user_cache_departments');
    localStorage.removeItem('user_cache_roles');
    userCache = {
      users: [...mockUsers],
      lastUpdated: new Date().toISOString(),
      departments: ['Administration', 'Sales', 'Engineering', 'Marketing', 'Finance', 'HR', 'Operations'],
      roles: ['admin', 'manager', 'employee']
    };
  },
  
  getCache: () => userCache,
  isOnline: isOnline,
  
  syncWhenOnline: async () => {
    if (isOnline()) {
      try {
        const freshData = await userAPI.getUsers();
        setCachedData('users', freshData);
        return freshData;
      } catch (error) {
        console.warn('Failed to sync users when online:', error);
        return null;
      }
    }
    return null;
  }
};

// mockUsers already exported at the top of the file - no duplicate needed