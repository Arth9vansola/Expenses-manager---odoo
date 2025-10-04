import { secureApiRequest } from './index';

export const approvalRulesAPI = {
  // Get all approval rules
  getAllRules: () =>
    secureApiRequest('/approval-rules/'),

  // Get approval rule by ID
  getRuleById: (id) =>
    secureApiRequest(`/approval-rules/${id}/`),

  // Create new approval rule
  createRule: (ruleData) =>
    secureApiRequest('/approval-rules/', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    }),

  // Update approval rule
  updateRule: (id, ruleData) =>
    secureApiRequest(`/approval-rules/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(ruleData),
    }),

  // Partial update approval rule
  patchRule: (id, ruleData) =>
    secureApiRequest(`/approval-rules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(ruleData),
    }),

  // Delete approval rule
  deleteRule: (id) =>
    secureApiRequest(`/approval-rules/${id}/`, {
      method: 'DELETE',
    }),

  // Validate rule configuration
  validateRule: (ruleData) =>
    secureApiRequest('/approval-rules/validate/', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    }),

  // Test rule against expense
  testRule: (ruleId, expenseData) =>
    secureApiRequest(`/approval-rules/${ruleId}/test/`, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    }),

  // Get rule templates
  getRuleTemplates: () =>
    secureApiRequest('/approval-rules/templates/'),

  // Clone existing rule
  cloneRule: (id, newName) =>
    secureApiRequest(`/approval-rules/${id}/clone/`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    }),

  // Get rules by type
  getRulesByType: (type) =>
    secureApiRequest(`/approval-rules/?type=${type}`),

  // Get active rules
  getActiveRules: () =>
    secureApiRequest('/approval-rules/?active=true'),

  // Activate/Deactivate rule
  toggleRuleStatus: (id, active) =>
    secureApiRequest(`/approval-rules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: active }),
    }),

  // Get rule history
  getRuleHistory: (id) =>
    secureApiRequest(`/approval-rules/${id}/history/`),

  // Bulk operations
  bulkActivate: (ruleIds) =>
    secureApiRequest('/approval-rules/bulk-activate/', {
      method: 'POST',
      body: JSON.stringify({ rule_ids: ruleIds }),
    }),

  bulkDeactivate: (ruleIds) =>
    secureApiRequest('/approval-rules/bulk-deactivate/', {
      method: 'POST',
      body: JSON.stringify({ rule_ids: ruleIds }),
    }),
};

export default approvalRulesAPI;