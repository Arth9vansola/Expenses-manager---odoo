// Mock API for approval rules management
const mockRules = [
  {
    id: '1',
    name: 'High Value Expense Approval',
    description: 'Expenses over $1000 require multi-level approval',
    ruleType: 'amount',
    approvalType: 'sequential',
    isActive: true,
    priority: 1,
    conditions: {
      minAmount: 1000,
      maxAmount: null,
      categories: [],
      departments: [],
      specificUsers: []
    },
    approvalSettings: {
      percentage: null,
      specificApprover: null,
      requireAll: false,
      allowDelegation: true,
      timeout: 72
    },
    approvers: [
      {
        id: 'approver_1',
        name: 'John Manager',
        role: 'Manager',
        userId: '2',
        order: 1,
        isRequired: true
      },
      {
        id: 'approver_2',
        name: 'Sarah Director',
        role: 'Finance Director',
        userId: '5',
        order: 2,
        isRequired: true
      },
      {
        id: 'approver_3',
        name: 'Mike CFO',
        role: 'CFO',
        userId: '6',
        order: 3,
        isRequired: true
      }
    ],
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-02-01T14:30:00Z',
    createdBy: '1'
  },
  {
    id: '2',
    name: 'Travel Expense Approval',
    description: 'All travel expenses require manager approval',
    ruleType: 'category',
    approvalType: 'specific',
    isActive: true,
    priority: 2,
    conditions: {
      minAmount: null,
      maxAmount: null,
      categories: ['Travel'],
      departments: [],
      specificUsers: []
    },
    approvalSettings: {
      percentage: null,
      specificApprover: '2',
      requireAll: false,
      allowDelegation: true,
      timeout: 48
    },
    approvers: [],
    createdAt: '2024-01-20T10:15:00Z',
    updatedAt: '2024-01-20T10:15:00Z',
    createdBy: '1'
  },
  {
    id: '3',
    name: 'Marketing Department Approval',
    description: 'Marketing expenses over $500 require department head approval',
    ruleType: 'hybrid',
    approvalType: 'percentage',
    isActive: true,
    priority: 3,
    conditions: {
      minAmount: 500,
      maxAmount: null,
      categories: ['Marketing', 'Entertainment'],
      departments: ['Marketing'],
      specificUsers: []
    },
    approvalSettings: {
      percentage: 75,
      specificApprover: null,
      requireAll: false,
      allowDelegation: false,
      timeout: 24
    },
    approvers: [
      {
        id: 'approver_4',
        name: 'Lisa Marketing Head',
        role: 'Marketing Manager',
        userId: '7',
        order: 1,
        isRequired: true
      },
      {
        id: 'approver_5',
        name: 'David Director',
        role: 'Marketing Director',
        userId: '8',
        order: 2,
        isRequired: false
      }
    ],
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-10T16:45:00Z',
    createdBy: '1'
  },
  {
    id: '4',
    name: 'Emergency Expense Override',
    description: 'CFO can override any expense approval',
    ruleType: 'custom',
    approvalType: 'specific',
    isActive: false,
    priority: 99,
    conditions: {
      minAmount: null,
      maxAmount: null,
      categories: [],
      departments: [],
      specificUsers: []
    },
    approvalSettings: {
      percentage: null,
      specificApprover: '6',
      requireAll: false,
      allowDelegation: false,
      timeout: 2
    },
    approvers: [],
    createdAt: '2024-02-05T11:30:00Z',
    updatedAt: '2024-02-15T13:20:00Z',
    createdBy: '1'
  }
];

// Simulated API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate unique ID
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

export const approvalRulesAPI = {
  // Get all approval rules
  getRules: async () => {
    await delay(500);
    return [...mockRules].sort((a, b) => a.priority - b.priority);
  },

  // Get rule by ID
  getRule: async (id) => {
    await delay(300);
    const rule = mockRules.find(r => r.id === id);
    if (!rule) {
      throw new Error('Rule not found');
    }
    return rule;
  },

  // Create new rule
  createRule: async (ruleData) => {
    await delay(800);
    
    // Validate required fields
    if (!ruleData.name || !ruleData.description) {
      throw new Error('Name and description are required');
    }
    
    // Check for duplicate name
    if (mockRules.some(r => r.name === ruleData.name)) {
      throw new Error('Rule name must be unique');
    }
    
    const newRule = {
      ...ruleData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '1' // Current user
    };
    
    mockRules.push(newRule);
    return newRule;
  },

  // Update existing rule
  updateRule: async (id, ruleData) => {
    await delay(600);
    
    const ruleIndex = mockRules.findIndex(r => r.id === id);
    if (ruleIndex === -1) {
      throw new Error('Rule not found');
    }
    
    // Check for duplicate name (excluding current rule)
    if (mockRules.some(r => r.id !== id && r.name === ruleData.name)) {
      throw new Error('Rule name must be unique');
    }
    
    const updatedRule = {
      ...mockRules[ruleIndex],
      ...ruleData,
      id, // Preserve ID
      updatedAt: new Date().toISOString()
    };
    
    mockRules[ruleIndex] = updatedRule;
    return updatedRule;
  },

  // Delete rule
  deleteRule: async (id) => {
    await delay(400);
    
    const ruleIndex = mockRules.findIndex(r => r.id === id);
    if (ruleIndex === -1) {
      throw new Error('Rule not found');
    }
    
    // Check if rule is being used (in real app, check against actual expenses)
    const isInUse = false; // Mock check
    if (isInUse) {
      throw new Error('Cannot delete rule that is currently in use');
    }
    
    mockRules.splice(ruleIndex, 1);
    return { success: true };
  },

  // Toggle rule active status
  toggleRuleStatus: async (id) => {
    await delay(300);
    
    const rule = mockRules.find(r => r.id === id);
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date().toISOString();
    
    return rule;
  },

  // Reorder rules (update priorities)
  reorderRules: async (ruleIds) => {
    await delay(500);
    
    // Update priorities based on new order
    ruleIds.forEach((id, index) => {
      const rule = mockRules.find(r => r.id === id);
      if (rule) {
        rule.priority = index + 1;
        rule.updatedAt = new Date().toISOString();
      }
    });
    
    return [...mockRules].sort((a, b) => a.priority - b.priority);
  },

  // Get rules that apply to a specific expense
  getApplicableRules: async (expenseData) => {
    await delay(400);
    
    const applicableRules = mockRules.filter(rule => {
      if (!rule.isActive) return false;
      
      // Check amount conditions
      if (rule.ruleType === 'amount' || rule.ruleType === 'hybrid') {
        const amount = parseFloat(expenseData.amount) || 0;
        
        if (rule.conditions.minAmount && amount < rule.conditions.minAmount) {
          return false;
        }
        
        if (rule.conditions.maxAmount && amount > rule.conditions.maxAmount) {
          return false;
        }
      }
      
      // Check category conditions
      if (rule.ruleType === 'category' || rule.ruleType === 'hybrid') {
        if (rule.conditions.categories.length > 0 && 
            !rule.conditions.categories.includes(expenseData.category)) {
          return false;
        }
      }
      
      // Check department conditions
      if (rule.ruleType === 'department' || rule.ruleType === 'hybrid') {
        if (rule.conditions.departments.length > 0 && 
            !rule.conditions.departments.includes(expenseData.department)) {
          return false;
        }
      }
      
      // Check specific user conditions
      if (rule.conditions.specificUsers.length > 0 && 
          !rule.conditions.specificUsers.includes(expenseData.submittedBy)) {
        return false;
      }
      
      return true;
    });
    
    return applicableRules.sort((a, b) => a.priority - b.priority);
  },

  // Get rule statistics
  getRuleStats: async () => {
    await delay(300);
    
    const stats = {
      total: mockRules.length,
      active: mockRules.filter(r => r.isActive).length,
      inactive: mockRules.filter(r => !r.isActive).length,
      byType: {
        amount: mockRules.filter(r => r.ruleType === 'amount').length,
        category: mockRules.filter(r => r.ruleType === 'category').length,
        department: mockRules.filter(r => r.ruleType === 'department').length,
        hybrid: mockRules.filter(r => r.ruleType === 'hybrid').length,
        custom: mockRules.filter(r => r.ruleType === 'custom').length
      },
      byApprovalType: {
        sequential: mockRules.filter(r => r.approvalType === 'sequential').length,
        parallel: mockRules.filter(r => r.approvalType === 'parallel').length,
        percentage: mockRules.filter(r => r.approvalType === 'percentage').length,
        specific: mockRules.filter(r => r.approvalType === 'specific').length,
        hybrid: mockRules.filter(r => r.approvalType === 'hybrid').length
      }
    };
    
    return stats;
  },

  // Validate rule configuration
  validateRule: async (ruleData) => {
    await delay(200);
    
    const errors = [];
    
    // Basic validation
    if (!ruleData.name?.trim()) {
      errors.push('Rule name is required');
    }
    
    if (!ruleData.description?.trim()) {
      errors.push('Rule description is required');
    }
    
    // Type-specific validation
    if (ruleData.ruleType === 'amount') {
      if (!ruleData.conditions?.minAmount && !ruleData.conditions?.maxAmount) {
        errors.push('Amount-based rules require at least one amount condition');
      }
    }
    
    if (ruleData.ruleType === 'category') {
      if (!ruleData.conditions?.categories?.length) {
        errors.push('Category-based rules require at least one category');
      }
    }
    
    if (ruleData.ruleType === 'department') {
      if (!ruleData.conditions?.departments?.length) {
        errors.push('Department-based rules require at least one department');
      }
    }
    
    // Approval type validation
    if (ruleData.approvalType === 'percentage') {
      const percentage = parseFloat(ruleData.approvalSettings?.percentage);
      if (!percentage || percentage < 1 || percentage > 100) {
        errors.push('Percentage must be between 1 and 100');
      }
    }
    
    if (ruleData.approvalType === 'specific') {
      if (!ruleData.approvalSettings?.specificApprover) {
        errors.push('Specific approver is required');
      }
    }
    
    if ((ruleData.approvalType === 'sequential' || ruleData.approvalType === 'parallel') && 
        !ruleData.approvers?.length) {
      errors.push('At least one approver is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};