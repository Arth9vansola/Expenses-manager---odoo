// Approval Rules API with comprehensive rule management
import { mockUsers } from './user';

// Mock approval rules data
const mockApprovalRules = [
  {
    id: 'rule_1',
    name: 'Standard Expense Approval',
    description: 'Default approval workflow for regular expenses',
    isActive: true,
    isDefault: true,
    priority: 1,
    conditions: {
      amountRange: { min: 0, max: 500 },
      categories: ['meals', 'transport', 'office'],
      departments: ['all'],
      userRoles: ['employee']
    },
    approvalSteps: [
      {
        id: 'step_1',
        order: 1,
        type: 'user',
        approvers: ['2'], // Manager ID
        isRequired: true,
        canDelegate: true,
        timeout: 72, // hours
        escalationUserId: '5', // Director
        conditions: {}
      }
    ],
    createdBy: '1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    version: 1
  },
  {
    id: 'rule_2',
    name: 'High Value Approval',
    description: 'Multi-level approval for high-value expenses',
    isActive: true,
    isDefault: false,
    priority: 2,
    conditions: {
      amountRange: { min: 500, max: 5000 },
      categories: ['travel', 'accommodation', 'equipment'],
      departments: ['all'],
      userRoles: ['employee', 'manager']
    },
    approvalSteps: [
      {
        id: 'step_1',
        order: 1,
        type: 'role',
        approvers: ['manager'],
        isRequired: true,
        canDelegate: true,
        timeout: 48,
        escalationUserId: null,
        conditions: {}
      },
      {
        id: 'step_2',
        order: 2,
        type: 'user',
        approvers: ['5'], // Finance Director
        isRequired: true,
        canDelegate: false,
        timeout: 72,
        escalationUserId: '6', // CEO
        conditions: {}
      }
    ],
    createdBy: '1',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-02-01T14:20:00Z',
    version: 2
  },
  {
    id: 'rule_3',
    name: 'Executive Approval',
    description: 'CEO approval required for executive-level expenses',
    isActive: true,
    isDefault: false,
    priority: 3,
    conditions: {
      amountRange: { min: 5000, max: Infinity },
      categories: ['all'],
      departments: ['all'],
      userRoles: ['all']
    },
    approvalSteps: [
      {
        id: 'step_1',
        order: 1,
        type: 'role',
        approvers: ['manager'],
        isRequired: true,
        canDelegate: true,
        timeout: 24,
        escalationUserId: null,
        conditions: {}
      },
      {
        id: 'step_2',
        order: 2,
        type: 'user',
        approvers: ['5'], // Finance Director
        isRequired: true,
        canDelegate: false,
        timeout: 48,
        escalationUserId: null,
        conditions: {}
      },
      {
        id: 'step_3',
        order: 3,
        type: 'user',
        approvers: ['6'], // CEO
        isRequired: true,
        canDelegate: false,
        timeout: 72,
        escalationUserId: null,
        conditions: {}
      }
    ],
    createdBy: '1',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
    version: 1
  },
  {
    id: 'rule_4',
    name: 'Department Specific - IT',
    description: 'Special approval workflow for IT department equipment',
    isActive: true,
    isDefault: false,
    priority: 4,
    conditions: {
      amountRange: { min: 100, max: 3000 },
      categories: ['equipment', 'software'],
      departments: ['IT'],
      userRoles: ['employee']
    },
    approvalSteps: [
      {
        id: 'step_1',
        order: 1,
        type: 'user',
        approvers: ['7'], // IT Manager
        isRequired: true,
        canDelegate: true,
        timeout: 24,
        escalationUserId: '5',
        conditions: {}
      },
      {
        id: 'step_2',
        order: 2,
        type: 'user',
        approvers: ['5'], // Finance Director
        isRequired: false,
        canDelegate: false,
        timeout: 48,
        escalationUserId: null,
        conditions: {
          amountThreshold: 1500
        }
      }
    ],
    createdBy: '1',
    createdAt: '2024-02-01T11:30:00Z',
    updatedAt: '2024-02-15T16:45:00Z',
    version: 3
  }
];

// Rule templates for quick setup
const ruleTemplates = [
  {
    id: 'template_basic',
    name: 'Basic Single Approval',
    description: 'Single manager approval for small expenses',
    template: {
      conditions: {
        amountRange: { min: 0, max: 200 },
        categories: ['all'],
        departments: ['all']
      },
      approvalSteps: [
        {
          type: 'role',
          approvers: ['manager'],
          timeout: 72,
          isRequired: true
        }
      ]
    }
  },
  {
    id: 'template_dual',
    name: 'Dual Approval',
    description: 'Manager and finance approval for medium expenses',
    template: {
      conditions: {
        amountRange: { min: 200, max: 1000 },
        categories: ['all'],
        departments: ['all']
      },
      approvalSteps: [
        {
          type: 'role',
          approvers: ['manager'],
          timeout: 48,
          isRequired: true
        },
        {
          type: 'role',
          approvers: ['finance_director'],
          timeout: 72,
          isRequired: true
        }
      ]
    }
  }
];

// Cache for offline functionality
let rulesCache = {
  rules: [...mockApprovalRules],
  templates: [...ruleTemplates],
  lastUpdated: new Date().toISOString()
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
const isOnline = () => navigator.onLine;

// Cache management
const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(`rules_cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Failed to get cached rules data:', error);
    return null;
  }
};

const setCachedData = (key, data) => {
  try {
    localStorage.setItem(`rules_cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache rules data:', error);
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

// Comprehensive Rules API
export const rulesAPI = {
  // Get all approval rules
  async getApprovalRules(filters = {}) {
    try {
      const data = await apiClient.get('/rules?' + new URLSearchParams(filters));
      setCachedData('rules', data);
      return data;
    } catch (error) {
      console.warn('Failed to fetch rules from API, using cached data:', error);
      const cached = getCachedData('rules') || mockApprovalRules;
      
      // Apply filters to cached data
      let filteredRules = [...cached];
      
      if (filters.isActive !== undefined) {
        filteredRules = filteredRules.filter(r => r.isActive === (filters.isActive === 'true'));
      }
      if (filters.department) {
        filteredRules = filteredRules.filter(r => 
          r.conditions.departments.includes('all') || 
          r.conditions.departments.includes(filters.department)
        );
      }
      
      // Sort by priority
      filteredRules.sort((a, b) => a.priority - b.priority);
      
      return filteredRules;
    }
  },

  // Get rule by ID
  async getRuleById(id) {
    try {
      return await apiClient.get(`/rules/${id}`);
    } catch (error) {
      console.warn('Failed to fetch rule from API, using cached data:', error);
      const cached = getCachedData('rules') || mockApprovalRules;
      const rule = cached.find(r => r.id === id);
      
      if (!rule) {
        throw new Error('Rule not found');
      }
      
      return rule;
    }
  },

  // Create new rule
  async createRule(ruleData) {
    try {
      const data = await apiClient.post('/rules', ruleData);
      
      // Update local cache
      const cached = getCachedData('rules') || mockApprovalRules;
      cached.push(data);
      setCachedData('rules', cached);
      
      return data;
    } catch (error) {
      console.warn('Failed to create rule via API, using mock data:', error);
      
      // Mock rule creation
      const newRule = {
        id: generateId(),
        ...ruleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
      
      // Add to cache
      const cached = getCachedData('rules') || mockApprovalRules;
      cached.push(newRule);
      setCachedData('rules', cached);
      mockApprovalRules.push(newRule);
      
      return {
        success: true,
        rule: newRule,
        message: 'Rule created successfully'
      };
    }
  },

  // Update existing rule
  async updateRule(id, updates) {
    try {
      const data = await apiClient.put(`/rules/${id}`, updates);
      
      // Update local cache
      const cached = getCachedData('rules') || mockApprovalRules;
      const index = cached.findIndex(r => r.id === id);
      if (index !== -1) {
        cached[index] = { ...cached[index], ...data };
        setCachedData('rules', cached);
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to update rule via API, using mock data:', error);
      
      // Mock rule update
      const cached = getCachedData('rules') || mockApprovalRules;
      const index = cached.findIndex(r => r.id === id);
      
      if (index === -1) {
        throw new Error('Rule not found');
      }
      
      const updatedRule = {
        ...cached[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        version: (cached[index].version || 1) + 1
      };
      
      cached[index] = updatedRule;
      setCachedData('rules', cached);
      
      // Update in-memory cache
      const memIndex = mockApprovalRules.findIndex(r => r.id === id);
      if (memIndex !== -1) {
        mockApprovalRules[memIndex] = updatedRule;
      }
      
      return {
        success: true,
        rule: updatedRule,
        message: 'Rule updated successfully'
      };
    }
  },

  // Delete rule
  async deleteRule(id) {
    try {
      await apiClient.delete(`/rules/${id}`);
      
      // Update local cache
      const cached = getCachedData('rules') || mockApprovalRules;
      const filteredRules = cached.filter(r => r.id !== id);
      setCachedData('rules', filteredRules);
      
      return { success: true };
    } catch (error) {
      console.warn('Failed to delete rule via API, using mock data:', error);
      
      // Mock rule deletion
      const cached = getCachedData('rules') || mockApprovalRules;
      const index = cached.findIndex(r => r.id === id);
      
      if (index === -1) {
        throw new Error('Rule not found');
      }
      
      // Remove from cache
      cached.splice(index, 1);
      setCachedData('rules', cached);
      
      // Remove from in-memory cache
      const memIndex = mockApprovalRules.findIndex(r => r.id === id);
      if (memIndex !== -1) {
        mockApprovalRules.splice(memIndex, 1);
      }
      
      return {
        success: true,
        message: 'Rule deleted successfully'
      };
    }
  },

  // Test rule against expense
  async testRule(ruleId, expenseData) {
    try {
      return await apiClient.post(`/rules/${ruleId}/test`, expenseData);
    } catch (error) {
      console.warn('Failed to test rule via API, using mock logic:', error);
      
      // Mock rule testing
      const rule = await this.getRuleById(ruleId);
      const result = this.evaluateRuleConditions(rule, expenseData);
      
      return {
        matches: result.matches,
        approvalSteps: result.matches ? rule.approvalSteps : [],
        message: result.message,
        details: result.details
      };
    }
  },

  // Find matching rule for expense
  async findMatchingRule(expenseData) {
    try {
      return await apiClient.post('/rules/match', expenseData);
    } catch (error) {
      console.warn('Failed to find matching rule via API, using cached data:', error);
      
      const rules = await this.getApprovalRules({ isActive: 'true' });
      
      // Sort by priority and find first match
      for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
        const evaluation = this.evaluateRuleConditions(rule, expenseData);
        if (evaluation.matches) {
          return {
            rule,
            approvalSteps: rule.approvalSteps,
            message: 'Matching rule found',
            confidence: evaluation.confidence || 1.0
          };
        }
      }
      
      // Return default rule if no specific match
      const defaultRule = rules.find(r => r.isDefault);
      if (defaultRule) {
        return {
          rule: defaultRule,
          approvalSteps: defaultRule.approvalSteps,
          message: 'Using default rule',
          confidence: 0.5
        };
      }
      
      throw new Error('No matching approval rule found');
    }
  },

  // Get rule templates
  async getRuleTemplates() {
    try {
      return await apiClient.get('/rules/templates');
    } catch (error) {
      console.warn('Failed to fetch templates from API, using cached data:', error);
      return getCachedData('templates') || ruleTemplates;
    }
  },

  // Validate rule configuration
  async validateRule(ruleData) {
    try {
      return await apiClient.post('/rules/validate', ruleData);
    } catch (error) {
      console.warn('Failed to validate rule via API, using client validation:', error);
      
      // Client-side validation
      const errors = [];
      const warnings = [];
      
      // Required field validation
      if (!ruleData.name || ruleData.name.trim().length < 3) {
        errors.push('Rule name must be at least 3 characters long');
      }
      
      if (!ruleData.conditions) {
        errors.push('Rule conditions are required');
      } else {
        if (!ruleData.conditions.amountRange || 
            ruleData.conditions.amountRange.min < 0 || 
            ruleData.conditions.amountRange.max <= ruleData.conditions.amountRange.min) {
          errors.push('Invalid amount range specified');
        }
      }
      
      if (!ruleData.approvalSteps || ruleData.approvalSteps.length === 0) {
        errors.push('At least one approval step is required');
      } else {
        // Validate approval steps
        ruleData.approvalSteps.forEach((step, index) => {
          if (!step.approvers || step.approvers.length === 0) {
            errors.push(`Approval step ${index + 1} must have at least one approver`);
          }
          if (step.timeout <= 0) {
            warnings.push(`Approval step ${index + 1} has no timeout specified`);
          }
        });
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions: this.generateRuleSuggestions(ruleData)
      };
    }
  },

  // Get rule statistics
  async getRuleStats() {
    try {
      return await apiClient.get('/rules/stats');
    } catch (error) {
      console.warn('Failed to fetch rule stats from API, calculating from cached data:', error);
      
      const rules = getCachedData('rules') || mockApprovalRules;
      
      return {
        totalRules: rules.length,
        activeRules: rules.filter(r => r.isActive).length,
        inactiveRules: rules.filter(r => !r.isActive).length,
        defaultRules: rules.filter(r => r.isDefault).length,
        averageApprovalSteps: rules.reduce((sum, r) => sum + r.approvalSteps.length, 0) / rules.length,
        rulesByCategory: this.groupRulesByCategory(rules),
        recentlyUpdated: rules.filter(r => {
          const updatedAt = new Date(r.updatedAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return updatedAt > weekAgo;
        }).length
      };
    }
  },

  // Bulk update rules
  async bulkUpdateRules(updates) {
    try {
      return await apiClient.put('/rules/bulk', updates);
    } catch (error) {
      console.warn('Failed to bulk update via API, using mock data:', error);
      
      const results = [];
      
      for (const update of updates) {
        try {
          const result = await this.updateRule(update.id, update.data);
          results.push({ id: update.id, status: 'success', result });
        } catch (updateError) {
          results.push({ id: update.id, status: 'error', error: updateError.message });
        }
      }
      
      return {
        success: true,
        results,
        totalProcessed: updates.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      };
    }
  },

  // Helper methods
  evaluateRuleConditions(rule, expenseData) {
    const conditions = rule.conditions;
    let matches = true;
    let confidence = 1.0;
    const details = [];
    
    // Check amount range
    if (conditions.amountRange) {
      const amount = expenseData.amount || 0;
      if (amount < conditions.amountRange.min || amount > conditions.amountRange.max) {
        matches = false;
        details.push(`Amount ${amount} is outside range ${conditions.amountRange.min}-${conditions.amountRange.max}`);
      } else {
        details.push(`Amount ${amount} matches range ${conditions.amountRange.min}-${conditions.amountRange.max}`);
      }
    }
    
    // Check categories
    if (conditions.categories && !conditions.categories.includes('all')) {
      if (!conditions.categories.includes(expenseData.category)) {
        matches = false;
        details.push(`Category '${expenseData.category}' not in allowed categories: ${conditions.categories.join(', ')}`);
      } else {
        details.push(`Category '${expenseData.category}' is allowed`);
      }
    }
    
    // Check departments
    if (conditions.departments && !conditions.departments.includes('all')) {
      if (!conditions.departments.includes(expenseData.department)) {
        matches = false;
        details.push(`Department '${expenseData.department}' not in allowed departments: ${conditions.departments.join(', ')}`);
      } else {
        details.push(`Department '${expenseData.department}' is allowed`);
      }
    }
    
    return {
      matches,
      confidence,
      details,
      message: matches ? 'Rule conditions satisfied' : 'Rule conditions not met'
    };
  },

  generateRuleSuggestions(ruleData) {
    const suggestions = [];
    
    if (ruleData.conditions && ruleData.conditions.amountRange) {
      if (ruleData.conditions.amountRange.max > 10000) {
        suggestions.push('Consider adding CEO approval for very high amounts');
      }
      if (ruleData.conditions.amountRange.min === 0) {
        suggestions.push('Consider setting a minimum amount threshold');
      }
    }
    
    if (ruleData.approvalSteps) {
      if (ruleData.approvalSteps.length > 3) {
        suggestions.push('More than 3 approval steps may slow down processing');
      }
      
      const hasTimeout = ruleData.approvalSteps.every(step => step.timeout > 0);
      if (!hasTimeout) {
        suggestions.push('Consider adding timeouts to prevent approval delays');
      }
    }
    
    return suggestions;
  },

  groupRulesByCategory(rules) {
    const groups = {};
    
    rules.forEach(rule => {
      rule.conditions.categories.forEach(category => {
        if (!groups[category]) {
          groups[category] = 0;
        }
        groups[category]++;
      });
    });
    
    return groups;
  }
};

// Cache manager
export const rulesCacheManager = {
  clearCache: () => {
    localStorage.removeItem('rules_cache_rules');
    localStorage.removeItem('rules_cache_templates');
    rulesCache = {
      rules: [...mockApprovalRules],
      templates: [...ruleTemplates],
      lastUpdated: new Date().toISOString()
    };
  },
  
  getCache: () => rulesCache,
  isOnline: isOnline,
  
  syncWhenOnline: async () => {
    if (isOnline()) {
      try {
        const freshData = await rulesAPI.getApprovalRules();
        setCachedData('rules', freshData);
        return freshData;
      } catch (error) {
        console.warn('Failed to sync rules when online:', error);
        return null;
      }
    }
    return null;
  }
};

// Export for backward compatibility
export { mockApprovalRules, ruleTemplates };
export default rulesAPI;