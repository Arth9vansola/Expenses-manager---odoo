// Approval Workflow API with comprehensive integration
import { mockUsers } from './user';
import { mockExpenses } from './expenses';

// Mock approval workflow rules
const APPROVAL_RULES = {
  // Amount-based approval chains
  levels: [
    { maxAmount: 100, approvers: ['manager'] },
    { maxAmount: 1000, approvers: ['manager', 'senior-manager'] },
    { maxAmount: 5000, approvers: ['manager', 'senior-manager', 'director'] },
    { maxAmount: Infinity, approvers: ['manager', 'senior-manager', 'director', 'ceo'] }
  ],
  
  // Category-specific rules
  categoryRules: {
    travel: { requiresReceipt: true, maxAmount: 2000 },
    meals: { requiresReceipt: false, maxAmount: 100 },
    office: { requiresReceipt: true, maxAmount: 500 },
    transport: { requiresReceipt: false, maxAmount: 200 },
    accommodation: { requiresReceipt: true, maxAmount: 1500 },
    other: { requiresReceipt: true, maxAmount: 300 }
  }
};

// Mock approval data
const mockApprovals = [
  {
    id: 'app1',
    expenseId: '1',
    approverId: '2',
    approverName: 'John Manager',
    status: 'pending',
    order: 1,
    requestedAt: '2024-10-01T09:30:00Z',
    dueDate: '2024-10-04T09:30:00Z',
    approvedAt: null,
    rejectedAt: null,
    comments: '',
    isRequired: true,
    canDelegate: true,
    delegatedTo: null,
    priority: 'normal',
    reminderSent: false
  },
  {
    id: 'app2',
    expenseId: '1',
    approverId: '5',
    approverName: 'Sarah Director',
    status: 'waiting',
    order: 2,
    requestedAt: null,
    dueDate: null,
    approvedAt: null,
    rejectedAt: null,
    comments: '',
    isRequired: true,
    canDelegate: false,
    delegatedTo: null,
    priority: 'normal',
    reminderSent: false
  },
  {
    id: 'app3',
    expenseId: '2',
    approverId: '2',
    approverName: 'John Manager',
    status: 'approved',
    order: 1,
    requestedAt: '2024-09-28T14:20:00Z',
    dueDate: '2024-10-01T14:20:00Z',
    approvedAt: '2024-09-29T10:15:00Z',
    rejectedAt: null,
    comments: 'Approved for conference travel',
    isRequired: true,
    canDelegate: true,
    delegatedTo: null,
    priority: 'high',
    reminderSent: false
  },
  {
    id: 'app4',
    expenseId: '3',
    approverId: '2',
    approverName: 'John Manager',
    status: 'rejected',
    order: 1,
    requestedAt: '2024-09-30T16:45:00Z',
    dueDate: '2024-10-03T16:45:00Z',
    approvedAt: null,
    rejectedAt: '2024-10-01T11:00:00Z',
    comments: 'Exceeds monthly office supply budget. Please submit separate request for business items only.',
    isRequired: true,
    canDelegate: true,
    delegatedTo: null,
    priority: 'low',
    reminderSent: true
  }
];

// Approval workflow templates
const approvalWorkflows = [
  {
    id: 'workflow_1',
    name: 'Standard Approval',
    description: 'Single manager approval',
    steps: [
      { order: 1, role: 'manager', isRequired: true, timeout: 72 }
    ]
  },
  {
    id: 'workflow_2',
    name: 'High Value Approval',
    description: 'Manager and finance director approval for high value expenses',
    steps: [
      { order: 1, role: 'manager', isRequired: true, timeout: 48 },
      { order: 2, role: 'finance_director', isRequired: true, timeout: 72 }
    ]
  },
  {
    id: 'workflow_3',
    name: 'Department Head Approval',
    description: 'Department head and manager approval',
    steps: [
      { order: 1, role: 'department_head', isRequired: true, timeout: 48 },
      { order: 2, role: 'manager', isRequired: true, timeout: 24 }
    ]
  }
];

// Cache for offline functionality
let approvalCache = {
  approvals: [...mockApprovals],
  workflows: [...approvalWorkflows],
  lastUpdated: new Date().toISOString(),
  pendingApprovals: mockApprovals.filter(a => a.status === 'pending'),
  myApprovals: []
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
const isOnline = () => navigator.onLine;

// Cache management
const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`approval_cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Failed to get cached approval data:', error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(`approval_cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache approval data:', error);
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
  }
};

// Using imported mockExpenses from ./expenses - no duplicate declaration needed

// Mock team structure - using user IDs that match mockUsers
const mockTeamStructure = {
  '2': {
    id: '2',
    name: 'Manager User',
    role: 'manager',
    department: 'Multi-department',
    teamMembers: ['3', '4', '5'],
    canApprove: ['manager']
  },
  'mgr-001': {
    id: 'mgr-001',
    name: 'Sarah Wilson',
    role: 'manager',
    department: 'Multi-department',
    teamMembers: ['emp-003', 'emp-004', 'emp-005', 'emp-006', 'emp-007'],
    canApprove: ['manager']
  },
  'mgr-002': {
    id: 'mgr-002',
    name: 'David Chen',
    role: 'senior-manager',
    department: 'Operations',
    teamMembers: ['mgr-001', '2'],
    canApprove: ['manager', 'senior-manager']
  },
  'admin': {
    id: 'admin',
    name: 'Admin User',
    role: 'admin',
    department: 'Administration',
    teamMembers: ['2', 'mgr-001', 'mgr-002'],
    canApprove: ['admin']
  }
};

// Utility functions for approval chain generation
const generateApprovalChain = (amount, category) => {
  // Find the appropriate approval level based on amount
  const level = APPROVAL_RULES.levels.find(l => amount <= l.maxAmount);
  
  if (!level) {
    throw new Error('Amount exceeds maximum approval limit');
  }

  // Build approval chain based on level and category
  const chain = [];
  const approvers = {
    'manager': { id: 'mgr-001', name: 'Sarah Wilson', role: 'manager' },
    'senior-manager': { id: 'mgr-002', name: 'David Chen', role: 'senior-manager' },
    'director': { id: 'dir-001', name: 'Michael Johnson', role: 'director' },
    'ceo': { id: 'ceo-001', name: 'Jennifer Lee', role: 'ceo' }
  };

  level.approvers.forEach((approverRole, index) => {
    const approver = approvers[approverRole];
    if (approver) {
      chain.push({
        ...approver,
        status: index === 0 ? 'pending' : 'waiting'
      });
    }
  });

  return chain;
};

const getNextApprover = (approvalChain, currentApproverId) => {
  const currentIndex = approvalChain.findIndex(a => a.id === currentApproverId);
  if (currentIndex === -1 || currentIndex === approvalChain.length - 1) {
    return null; // No next approver (final approval)
  }
  return approvalChain[currentIndex + 1];
};

// API Methods
export const approvalAPI = {
  // Get expenses pending approval for a specific manager
  getPendingApprovals: async (managerId) => {
    await delay(800);
    
    try {
      // Convert managerId to string for comparison
      const managerIdStr = String(managerId);
      const pendingExpenses = mockExpenses.filter(expense => 
        expense.status === 'pending' && String(expense.currentApproverId) === managerIdStr
      );
      
      return pendingExpenses.sort((a, b) => {
        // Sort by priority (urgent first) then by submission date
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      });
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      return []; // Return empty array instead of throwing
    }
  },

  // Get all expenses for manager's team
  getTeamExpenses: async (managerId) => {
    await delay(600);
    
    try {
      // Admin can see all expenses
      if (managerId === 'admin' || managerId === '1') {
        return mockExpenses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      }

      const manager = mockTeamStructure[managerId];
      if (!manager) {
        // Fallback: return expenses for current user if manager not found
        console.warn(`Manager ${managerId} not found, returning all expenses`);
        return mockExpenses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      }

      // Get expenses for all team members
      const managerIdStr = String(managerId);
      const teamExpenses = mockExpenses.filter(expense =>
        manager.teamMembers.includes(String(expense.employeeId)) ||
        expense.approvalChain.some(approver => String(approver.id) === managerIdStr)
      );

      return teamExpenses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    } catch (error) {
      console.error('Error fetching team expenses:', error);
      // Return all expenses as fallback
      return mockExpenses.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    }
  },

  // Process approval (approve or reject)
  processApproval: async (approvalData) => {
    await delay(1000);
    
    try {
      const { expenseId, action, comment, approverId } = approvalData;
      
      const expenseIndex = mockExpenses.findIndex(e => e.id === expenseId);
      if (expenseIndex === -1) {
        throw new Error('Expense not found');
      }

      const expense = mockExpenses[expenseIndex];
      
      // Verify approver has permission (allow admin override)
      if (String(expense.currentApproverId) !== String(approverId) && approverId !== 'admin' && approverId !== '1') {
        throw new Error('Not authorized to approve this expense');
      }

      const approver = mockTeamStructure[approverId] || {
        id: approverId,
        name: approverId === 'admin' || approverId === '1' ? 'Admin User' : 'Manager User',
        role: approverId === 'admin' || approverId === '1' ? 'admin' : 'manager'
      };

      // Add to approval history
      const historyEntry = {
        approverId: approverId,
        approverName: approver.name,
        action: action,
        timestamp: new Date().toISOString(),
        comment: comment
      };
      
      expense.approvalHistory.push(historyEntry);

      // Update approval chain status
      const currentApproverIndex = expense.approvalChain.findIndex(a => a.id === approverId);
      if (currentApproverIndex !== -1) {
        expense.approvalChain[currentApproverIndex].status = action === 'approve' ? 'approved' : 'rejected';
      }

      if (action === 'approve') {
        // Check if there's a next approver
        const nextApprover = getNextApprover(expense.approvalChain, approverId);
        
        if (nextApprover) {
          // Move to next approver
          expense.currentApproverId = nextApprover.id;
          expense.status = 'pending';
          
          // Update next approver status to pending
          const nextApproverIndex = expense.approvalChain.findIndex(a => a.id === nextApprover.id);
          if (nextApproverIndex !== -1) {
            expense.approvalChain[nextApproverIndex].status = 'pending';
          }
        } else {
          // Final approval
          expense.status = 'approved';
          expense.currentApproverId = null;
          expense.approvedAt = new Date().toISOString();
          expense.finalApproverId = approverId;
        }
      } else {
        // Rejection
        expense.status = 'rejected';
        expense.currentApproverId = null;
        expense.rejectedAt = new Date().toISOString();
        expense.rejectionReason = comment;
        expense.rejectedBy = approverId;
      }

      // Update the expense in mock database
      mockExpenses[expenseIndex] = expense;

      return expense;
    } catch (error) {
      throw new Error(error.message || 'Failed to process approval');
    }
  },

  // Get approval statistics for a manager
  getApprovalStats: async (managerId) => {
    await delay(400);
    
    try {
      const manager = mockTeamStructure[managerId];
      if (!manager) {
        throw new Error('Manager not found');
      }

      const teamExpenses = mockExpenses.filter(expense =>
        manager.teamMembers.includes(expense.employeeId) ||
        expense.approvalChain.some(approver => approver.id === managerId)
      );

      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();

      const monthlyExpenses = teamExpenses.filter(e => {
        const expenseDate = new Date(e.submittedAt);
        return expenseDate.getMonth() === thisMonth && expenseDate.getFullYear() === thisYear;
      });

      const stats = {
        totalPending: teamExpenses.filter(e => e.status === 'pending' && e.currentApproverId === managerId).length,
        totalApproved: teamExpenses.filter(e => e.status === 'approved').length,
        totalRejected: teamExpenses.filter(e => e.status === 'rejected').length,
        monthlyApproved: monthlyExpenses.filter(e => e.status === 'approved').length,
        monthlyRejected: monthlyExpenses.filter(e => e.status === 'rejected').length,
        monthlyAmount: monthlyExpenses
          .filter(e => e.status === 'approved')
          .reduce((sum, e) => sum + e.amount, 0),
        pendingAmount: teamExpenses
          .filter(e => e.status === 'pending' && e.currentApproverId === managerId)
          .reduce((sum, e) => sum + e.amount, 0),
        teamSize: manager.teamMembers.length,
        avgApprovalTime: '2.3 hours', // Mock calculation
        approvalRate: '87%' // Mock calculation
      };

      return stats;
    } catch (error) {
      throw new Error('Failed to fetch approval statistics');
    }
  },

  // Get approval workflow rules
  getApprovalRules: async () => {
    await delay(200);
    return APPROVAL_RULES;
  },

  // Bulk approve multiple expenses
  bulkApprove: async (expenseIds, approverId, comment = '') => {
    await delay(1500);
    
    try {
      const results = [];
      
      for (const expenseId of expenseIds) {
        try {
          const result = await approvalAPI.processApproval({
            expenseId,
            action: 'approve',
            comment,
            approverId
          });
          results.push({ expenseId, status: 'success', expense: result });
        } catch (error) {
          results.push({ expenseId, status: 'error', error: error.message });
        }
      }

      return results;
    } catch (error) {
      throw new Error('Failed to process bulk approval');
    }
  },

  // Get expense approval history
  getApprovalHistory: async (expenseId) => {
    await delay(300);
    
    try {
      const expense = mockExpenses.find(e => e.id === expenseId);
      if (!expense) {
        throw new Error('Expense not found');
      }

      return {
        expense: expense,
        history: expense.approvalHistory,
        chain: expense.approvalChain
      };
    } catch (error) {
      throw new Error('Failed to fetch approval history');
    }
  }
};

// Comprehensive Approval API with real endpoint integration
export const comprehensiveApprovalAPI = {
  // Get approvals with filters
  async getApprovals(filters = {}) {
    try {
      const data = await apiClient.get('/approvals?' + new URLSearchParams(filters));
      setCachedData('approvals', data);
      return data;
    } catch (error) {
      console.warn('Failed to fetch approvals from API, using cached data:', error);
      const cached = getCachedData('approvals') || mockApprovals;
      
      // Apply filters to cached data
      let filteredApprovals = [...cached];
      
      if (filters.status) {
        filteredApprovals = filteredApprovals.filter(a => a.status === filters.status);
      }
      if (filters.approverId) {
        filteredApprovals = filteredApprovals.filter(a => a.approverId === filters.approverId);
      }
      if (filters.expenseId) {
        filteredApprovals = filteredApprovals.filter(a => a.expenseId === filters.expenseId);
      }
      
      return filteredApprovals;
    }
  },

  // Get pending approvals for user
  async getPendingApprovals(userId) {
    try {
      const data = await apiClient.get(`/approvals/pending/${userId}`);
      return data;
    } catch (error) {
      console.warn('Failed to fetch pending approvals from API, using cached data:', error);
      const cached = getCachedData('approvals') || mockApprovals;
      
      return cached.filter(a => 
        a.approverId === userId && 
        a.status === 'pending'
      );
    }
  },

  // Approve expense
  async approveExpense(approvalId, comments = '', delegatedFrom = null) {
    try {
      const data = await apiClient.post(`/approvals/${approvalId}/approve`, {
        comments,
        delegatedFrom
      });
      
      // Update local cache
      await this.updateApprovalCache(approvalId, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        comments
      });
      
      return data;
    } catch (error) {
      console.warn('Failed to approve via API, using mock data:', error);
      
      // Mock approval
      const cached = getCachedData('approvals') || mockApprovals;
      const index = cached.findIndex(a => a.id === approvalId);
      
      if (index === -1) {
        throw new Error('Approval not found');
      }
      
      const updatedApproval = {
        ...cached[index],
        status: 'approved',
        approvedAt: new Date().toISOString(),
        comments: comments || 'Approved'
      };
      
      cached[index] = updatedApproval;
      setCachedData('approvals', cached);
      
      // Update in-memory cache
      const memIndex = mockApprovals.findIndex(a => a.id === approvalId);
      if (memIndex !== -1) {
        mockApprovals[memIndex] = updatedApproval;
      }
      
      return {
        success: true,
        approval: updatedApproval,
        message: 'Expense approved successfully'
      };
    }
  },

  // Reject expense
  async rejectExpense(approvalId, reason, comments = '') {
    try {
      const data = await apiClient.post(`/approvals/${approvalId}/reject`, {
        reason,
        comments
      });
      
      // Update local cache
      await this.updateApprovalCache(approvalId, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        comments: reason + (comments ? ` - ${comments}` : '')
      });
      
      return data;
    } catch (error) {
      console.warn('Failed to reject via API, using mock data:', error);
      
      // Mock rejection
      const cached = getCachedData('approvals') || mockApprovals;
      const index = cached.findIndex(a => a.id === approvalId);
      
      if (index === -1) {
        throw new Error('Approval not found');
      }
      
      const updatedApproval = {
        ...cached[index],
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        comments: reason + (comments ? ` - ${comments}` : '')
      };
      
      cached[index] = updatedApproval;
      setCachedData('approvals', cached);
      
      // Update in-memory cache
      const memIndex = mockApprovals.findIndex(a => a.id === approvalId);
      if (memIndex !== -1) {
        mockApprovals[memIndex] = updatedApproval;
      }
      
      return {
        success: true,
        approval: updatedApproval,
        message: 'Expense rejected successfully'
      };
    }
  },

  // Delegate approval
  async delegateApproval(approvalId, delegateToId, reason = '') {
    try {
      const data = await apiClient.post(`/approvals/${approvalId}/delegate`, {
        delegateToId,
        reason
      });
      
      return data;
    } catch (error) {
      console.warn('Failed to delegate approval via API, using mock data:', error);
      
      // Mock delegation
      const cached = getCachedData('approvals') || mockApprovals;
      const index = cached.findIndex(a => a.id === approvalId);
      
      if (index === -1) {
        throw new Error('Approval not found');
      }
      
      if (!cached[index].canDelegate) {
        throw new Error('This approval cannot be delegated');
      }
      
      const delegateUser = mockUsers.find(u => u.id === delegateToId);
      if (!delegateUser) {
        throw new Error('Delegate user not found');
      }
      
      const updatedApproval = {
        ...cached[index],
        delegatedTo: {
          id: delegateToId,
          name: delegateUser.name,
          reason,
          delegatedAt: new Date().toISOString()
        }
      };
      
      cached[index] = updatedApproval;
      setCachedData('approvals', cached);
      
      return {
        success: true,
        approval: updatedApproval,
        message: `Approval delegated to ${delegateUser.name}`
      };
    }
  },

  // Get approval workflows
  async getWorkflows() {
    try {
      return await apiClient.get('/approvals/workflows');
    } catch (error) {
      console.warn('Failed to fetch workflows from API, using cached data:', error);
      return getCachedData('workflows') || approvalWorkflows;
    }
  },

  // Helper methods
  async updateApprovalCache(approvalId, updates) {
    const cached = getCachedData('approvals') || mockApprovals;
    const index = cached.findIndex(a => a.id === approvalId);
    
    if (index !== -1) {
      cached[index] = { ...cached[index], ...updates };
      setCachedData('approvals', cached);
    }
  }
};

// Cache manager
export const approvalCacheManager = {
  clearCache: () => {
    localStorage.removeItem('approval_cache_approvals');
    localStorage.removeItem('approval_cache_workflows');
    approvalCache = {
      approvals: [...mockApprovals],
      workflows: [...approvalWorkflows],
      lastUpdated: new Date().toISOString(),
      pendingApprovals: mockApprovals.filter(a => a.status === 'pending'),
      myApprovals: []
    };
  },
  
  getCache: () => approvalCache,
  isOnline: isOnline,
  
  syncWhenOnline: async () => {
    if (isOnline()) {
      try {
        const freshData = await comprehensiveApprovalAPI.getApprovals();
        setCachedData('approvals', freshData);
        return freshData;
      } catch (error) {
        console.warn('Failed to sync approvals when online:', error);
        return null;
      }
    }
    return null;
  }
};

// Export additional utilities
export const approvalUtils = {
  generateApprovalChain,
  getNextApprover,
  
  // Calculate expected approval time
  getExpectedApprovalTime: (approvalChain, currentStep = 0) => {
    const avgTimes = {
      manager: 4, // 4 hours
      'senior-manager': 8, // 8 hours  
      director: 24, // 1 day
      ceo: 72 // 3 days
    };

    const remainingTime = approvalChain
      .slice(currentStep)
      .reduce((total, approver) => total + (avgTimes[approver.role] || 4), 0);

    return remainingTime;
  },

  // Format approval status for display
  formatApprovalStatus: (status) => {
    const statusMap = {
      pending: { text: 'Pending Approval', color: 'warning', icon: '⏳' },
      approved: { text: 'Approved', color: 'success', icon: '✅' },
      rejected: { text: 'Rejected', color: 'danger', icon: '❌' },
      draft: { text: 'Draft', color: 'info', icon: '📝' }
    };

    return statusMap[status] || { text: status, color: 'secondary', icon: '❓' };
  },

  // Check if user can approve expense
  canApproveExpense: (expense, userId) => {
    return expense.status === 'pending' && expense.currentApproverId === userId;
  },

  // Get approval urgency level
  getApprovalUrgency: (expense) => {
    const submittedAt = new Date(expense.submittedAt);
    const now = new Date();
    const hoursWaiting = (now - submittedAt) / (1000 * 60 * 60);

    if (expense.priority === 'urgent' || hoursWaiting > 48) {
      return 'high';
    } else if (hoursWaiting > 24) {
      return 'medium';
    } else {
      return 'low';
    }
  }
};

export default approvalAPI;