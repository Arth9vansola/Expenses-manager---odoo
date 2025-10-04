import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ApprovalRuleForm from '../components/ApprovalRuleForm';
import { LoadingSpinner } from '../components/FormComponents';
import { approvalRulesAPI } from '../api/approvalRules';
import { formatCurrency } from '../api/expenses';
import './ApprovalRulesPage.css';

const ApprovalRulesPage = ({ user }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const rulesData = await approvalRulesAPI.getRules();
      setRules(rulesData);
    } catch (error) {
      showNotification('Failed to load approval rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateRule = async (ruleData) => {
    try {
      const newRule = await approvalRulesAPI.createRule(ruleData);
      setRules([...rules, newRule]);
      setShowAddModal(false);
      showNotification('Approval rule created successfully');
    } catch (error) {
      throw error;
    }
  };

  const handleEditRule = async (ruleData) => {
    try {
      const updatedRule = await approvalRulesAPI.updateRule(selectedRule.id, ruleData);
      setRules(rules.map(r => r.id === selectedRule.id ? updatedRule : r));
      setShowEditModal(false);
      setSelectedRule(null);
      showNotification('Approval rule updated successfully');
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteRule = async (rule) => {
    if (window.confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      try {
        await approvalRulesAPI.deleteRule(rule.id);
        setRules(rules.filter(r => r.id !== rule.id));
        showNotification('Approval rule deleted successfully');
      } catch (error) {
        showNotification('Failed to delete rule', 'error');
      }
    }
  };

  const handleToggleRuleStatus = async (rule) => {
    try {
      const updatedRule = await approvalRulesAPI.toggleRuleStatus(rule.id);
      setRules(rules.map(r => r.id === rule.id ? updatedRule : r));
      showNotification(`Rule ${updatedRule.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      showNotification('Failed to update rule status', 'error');
    }
  };

  const handleReorderRules = async (newOrder) => {
    try {
      const reorderedRules = await approvalRulesAPI.reorderRules(newOrder);
      setRules(reorderedRules);
      showNotification('Rules reordered successfully');
    } catch (error) {
      showNotification('Failed to reorder rules', 'error');
    }
  };

  const getRuleTypeIcon = (ruleType) => {
    const icons = {
      amount: '💰',
      category: '📂',
      department: '🏢',
      hybrid: '🔄',
      custom: '⚙️'
    };
    return icons[ruleType] || '📋';
  };

  const getRuleTypeLabel = (ruleType) => {
    const labels = {
      amount: 'Amount-based',
      category: 'Category-based',
      department: 'Department-based',
      hybrid: 'Hybrid Rule',
      custom: 'Custom Rule'
    };
    return labels[ruleType] || 'Unknown';
  };

  const getApprovalTypeLabel = (approvalType) => {
    const labels = {
      sequential: 'Sequential Approval',
      parallel: 'Parallel Approval',
      percentage: 'Percentage-based',
      specific: 'Specific Approver',
      hybrid: 'Hybrid (Percentage OR Specific)'
    };
    return labels[approvalType] || 'Unknown';
  };

  const getConditionSummary = (rule) => {
    const conditions = [];
    
    if (rule.conditions?.minAmount || rule.conditions?.maxAmount) {
      const min = rule.conditions.minAmount ? formatCurrency(rule.conditions.minAmount, 'USD') : '0';
      const max = rule.conditions.maxAmount ? formatCurrency(rule.conditions.maxAmount, 'USD') : '∞';
      conditions.push(`Amount: ${min} - ${max}`);
    }
    
    if (rule.conditions?.categories?.length > 0) {
      conditions.push(`Categories: ${rule.conditions.categories.join(', ')}`);
    }
    
    if (rule.conditions?.departments?.length > 0) {
      conditions.push(`Departments: ${rule.conditions.departments.join(', ')}`);
    }
    
    return conditions.join(' | ') || 'No conditions';
  };

  const getApprovalSummary = (rule) => {
    const summary = [];
    
    if (rule.approvalType === 'percentage' && rule.approvalSettings?.percentage) {
      summary.push(`${rule.approvalSettings.percentage}% approval required`);
    }
    
    if (rule.approvalType === 'specific' && rule.approvalSettings?.specificApprover) {
      summary.push(`Specific: ${rule.approvalSettings.specificApprover}`);
    }
    
    if (rule.approvers?.length > 0) {
      summary.push(`${rule.approvers.length} approver${rule.approvers.length > 1 ? 's' : ''}`);
    }
    
    return summary.join(' | ') || 'No approval settings';
  };

  return (
    <div className="container mt-2">
      <div className="approval-rules-header">
        <div>
          <h1>Approval Rules Configuration</h1>
          <p>Manage company-wide expense approval workflows</p>
        </div>
        
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>

      {/* Rules Overview Stats */}
      <div className="rules-stats-grid">
        <div className="stat-card">
          <div className="stat-number">{rules.length}</div>
          <div className="stat-label">Total Rules</div>
        </div>
        <div className="stat-card active">
          <div className="stat-number">{rules.filter(r => r.isActive).length}</div>
          <div className="stat-label">Active Rules</div>
        </div>
        <div className="stat-card inactive">
          <div className="stat-number">{rules.filter(r => !r.isActive).length}</div>
          <div className="stat-label">Inactive Rules</div>
        </div>
        <div className="stat-card types">
          <div className="stat-number">{new Set(rules.map(r => r.ruleType)).size}</div>
          <div className="stat-label">Rule Types</div>
        </div>
      </div>

      {/* Rules Management */}
      <div className="rules-management">
        <div className="rules-header">
          <h2>Approval Rules</h2>
          <div className="rules-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              ➕ Add New Rule
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Loading approval rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No approval rules configured</h3>
            <p>Create your first approval rule to start managing expense workflows.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Create First Rule
            </button>
          </div>
        ) : (
          <div className="rules-list">
            {rules.map((rule, index) => (
              <div 
                key={rule.id} 
                className={`rule-card ${!rule.isActive ? 'inactive' : ''}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  const dropIndex = index;
                  
                  if (dragIndex !== dropIndex) {
                    const newRules = [...rules];
                    const [draggedRule] = newRules.splice(dragIndex, 1);
                    newRules.splice(dropIndex, 0, draggedRule);
                    
                    // Update priority order
                    const reorderedRules = newRules.map((r, i) => ({ ...r, priority: i + 1 }));
                    setRules(reorderedRules);
                    handleReorderRules(reorderedRules.map(r => r.id));
                  }
                }}
              >
                <div className="rule-header">
                  <div className="rule-main-info">
                    <div className="rule-title-section">
                      <span className="rule-type-icon">{getRuleTypeIcon(rule.ruleType)}</span>
                      <div>
                        <h3 className="rule-name">{rule.name}</h3>
                        <p className="rule-description">{rule.description}</p>
                      </div>
                    </div>
                    
                    <div className="rule-badges">
                      <span className="rule-type-badge">{getRuleTypeLabel(rule.ruleType)}</span>
                      <span className="approval-type-badge">{getApprovalTypeLabel(rule.approvalType)}</span>
                      {rule.isActive ? (
                        <span className="status-badge active">Active</span>
                      ) : (
                        <span className="status-badge inactive">Inactive</span>
                      )}
                    </div>
                  </div>

                  <div className="rule-actions">
                    <button
                      className={`btn btn-sm ${rule.isActive ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleRuleStatus(rule)}
                      title={rule.isActive ? 'Deactivate Rule' : 'Activate Rule'}
                    >
                      {rule.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedRule(rule);
                        setShowEditModal(true);
                      }}
                      title="Edit Rule"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteRule(rule)}
                      title="Delete Rule"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className="rule-details">
                  <div className="rule-detail-section">
                    <h4>Conditions</h4>
                    <p>{getConditionSummary(rule)}</p>
                  </div>
                  
                  <div className="rule-detail-section">
                    <h4>Approval Flow</h4>
                    <p>{getApprovalSummary(rule)}</p>
                  </div>
                  
                  {rule.approvers && rule.approvers.length > 0 && (
                    <div className="rule-detail-section">
                      <h4>Approvers ({rule.approvers.length})</h4>
                      <div className="approvers-chain">
                        {rule.approvers.map((approver, idx) => (
                          <div key={idx} className="approver-item">
                            <span className="approver-step">{idx + 1}</span>
                            <span className="approver-name">{approver.name}</span>
                            <span className="approver-role">({approver.role})</span>
                            {idx < rule.approvers.length - 1 && (
                              <span className="approver-arrow">→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rule-metadata">
                    <div className="metadata-item">
                      <span className="metadata-label">Priority:</span>
                      <span className="metadata-value">{rule.priority}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Created:</span>
                      <span className="metadata-value">{new Date(rule.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Last Modified:</span>
                      <span className="metadata-value">{new Date(rule.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="drag-handle" title="Drag to reorder">
                  ⋮⋮
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Approval Rule"
        size="large"
      >
        <ApprovalRuleForm
          onSubmit={handleCreateRule}
          onCancel={() => setShowAddModal(false)}
          existingRules={rules}
          isEdit={false}
        />
      </Modal>

      {/* Edit Rule Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRule(null);
        }}
        title="Edit Approval Rule"
        size="large"
      >
        <ApprovalRuleForm
          onSubmit={handleEditRule}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedRule(null);
          }}
          existingRules={rules.filter(r => r.id !== selectedRule?.id)}
          initialData={selectedRule}
          isEdit={true}
        />
      </Modal>
    </div>
  );
};

export default ApprovalRulesPage;