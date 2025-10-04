import React, { useState, useEffect } from 'react';
import { FormInput as InputField, FormSelect as SelectField, FormTextArea as TextAreaField, FormCheckbox as CheckboxField } from './FormComponents';
import { userAPI } from '../api/users';
import './ApprovalRuleForm.css';

const ApprovalRuleForm = ({ 
  onSubmit, 
  onCancel, 
  existingRules = [], 
  initialData = null, 
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ruleType: 'amount',
    approvalType: 'sequential',
    isActive: true,
    priority: existingRules.length + 1,
    
    // Conditions
    conditions: {
      minAmount: '',
      maxAmount: '',
      categories: [],
      departments: [],
      specificUsers: []
    },
    
    // Approval Settings
    approvalSettings: {
      percentage: '',
      specificApprover: '',
      requireAll: false,
      allowDelegation: true,
      timeout: 72, // hours
    },
    
    // Approvers
    approvers: []
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableUsers, setAvailableUsers] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  // Available options
  const expenseCategories = [
    'Travel', 'Meals', 'Office Supplies', 'Software', 'Equipment', 
    'Training', 'Marketing', 'Entertainment', 'Utilities', 'Other'
  ];
  
  const departments = [
    'Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 
    'Operations', 'Customer Service', 'Legal', 'IT'
  ];

  const approverRoles = [
    'Manager', 'Senior Manager', 'Director', 'Finance Manager', 
    'CFO', 'CEO', 'Department Head', 'Team Lead'
  ];

  useEffect(() => {
    loadUsers();
    if (initialData) {
      setFormData({
        ...initialData,
        conditions: initialData.conditions || formData.conditions,
        approvalSettings: initialData.approvalSettings || formData.approvalSettings,
        approvers: initialData.approvers || []
      });
    }
  }, [initialData]);

  const loadUsers = async () => {
    try {
      const users = await userAPI.getUsers();
      setAvailableUsers(users.filter(u => u.role !== 'Employee'));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Rule name is required';
    } else if (existingRules.some(r => r.name === formData.name)) {
      newErrors.name = 'Rule name must be unique';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Rule description is required';
    }
    
    // Validate conditions based on rule type
    if (formData.ruleType === 'amount') {
      if (!formData.conditions.minAmount && !formData.conditions.maxAmount) {
        newErrors.conditions = 'Amount-based rules require at least one amount condition';
      }
      
      if (formData.conditions.minAmount && formData.conditions.maxAmount) {
        if (parseFloat(formData.conditions.minAmount) >= parseFloat(formData.conditions.maxAmount)) {
          newErrors.conditions = 'Minimum amount must be less than maximum amount';
        }
      }
    }
    
    if (formData.ruleType === 'category' && formData.conditions.categories.length === 0) {
      newErrors.conditions = 'Category-based rules require at least one category';
    }
    
    if (formData.ruleType === 'department' && formData.conditions.departments.length === 0) {
      newErrors.conditions = 'Department-based rules require at least one department';
    }
    
    // Validate approval settings
    if (formData.approvalType === 'percentage') {
      if (!formData.approvalSettings.percentage || 
          formData.approvalSettings.percentage < 1 || 
          formData.approvalSettings.percentage > 100) {
        newErrors.approvalSettings = 'Percentage must be between 1 and 100';
      }
    }
    
    if (formData.approvalType === 'specific' && !formData.approvalSettings.specificApprover) {
      newErrors.approvalSettings = 'Specific approver is required';
    }
    
    if ((formData.approvalType === 'sequential' || formData.approvalType === 'parallel') 
        && formData.approvers.length === 0) {
      newErrors.approvers = 'At least one approver is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field] || errors[field.split('.')[0]]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
        [field.split('.')[0]]: undefined
      }));
    }
  };

  const handleArrayChange = (field, value, isChecked) => {
    const [parent, child] = field.split('.');
    setFormData(prev => {
      const currentArray = prev[parent][child] || [];
      
      if (isChecked) {
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: [...currentArray, value]
          }
        };
      } else {
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: currentArray.filter(item => item !== value)
          }
        };
      }
    });
  };

  const addApprover = () => {
    const newApprover = {
      id: `temp_${Date.now()}`,
      name: '',
      role: '',
      userId: '',
      order: formData.approvers.length + 1,
      isRequired: true
    };
    
    setFormData(prev => ({
      ...prev,
      approvers: [...prev.approvers, newApprover]
    }));
  };

  const updateApprover = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      approvers: prev.approvers.map((approver, idx) => 
        idx === index 
          ? { 
              ...approver, 
              [field]: value,
              ...(field === 'userId' && value ? {
                name: availableUsers.find(u => u.id === value)?.name || '',
                role: availableUsers.find(u => u.id === value)?.role || ''
              } : {})
            }
          : approver
      )
    }));
  };

  const removeApprover = (index) => {
    setFormData(prev => ({
      ...prev,
      approvers: prev.approvers.filter((_, idx) => idx !== index)
        .map((approver, idx) => ({ ...approver, order: idx + 1 }))
    }));
  };

  const moveApprover = (fromIndex, toIndex) => {
    const newApprovers = [...formData.approvers];
    const [movedApprover] = newApprovers.splice(fromIndex, 1);
    newApprovers.splice(toIndex, 0, movedApprover);
    
    // Update order
    const reorderedApprovers = newApprovers.map((approver, idx) => ({
      ...approver,
      order: idx + 1
    }));
    
    setFormData(prev => ({
      ...prev,
      approvers: reorderedApprovers
    }));
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveApprover(draggedIndex, dropIndex);
    }
    
    setDraggedIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        // Convert string amounts to numbers
        conditions: {
          ...formData.conditions,
          minAmount: formData.conditions.minAmount ? parseFloat(formData.conditions.minAmount) : null,
          maxAmount: formData.conditions.maxAmount ? parseFloat(formData.conditions.maxAmount) : null,
        },
        approvalSettings: {
          ...formData.approvalSettings,
          percentage: formData.approvalSettings.percentage ? parseFloat(formData.approvalSettings.percentage) : null,
        }
      };
      
      await onSubmit(submitData);
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save rule' });
    } finally {
      setLoading(false);
    }
  };

  const renderConditionsSection = () => {
    switch (formData.ruleType) {
      case 'amount':
        return (
          <div className="conditions-grid">
            <InputField
              label="Minimum Amount ($)"
              type="number"
              value={formData.conditions.minAmount}
              onChange={(e) => handleInputChange('conditions.minAmount', e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            <InputField
              label="Maximum Amount ($)"
              type="number"
              value={formData.conditions.maxAmount}
              onChange={(e) => handleInputChange('conditions.maxAmount', e.target.value)}
              placeholder="No limit"
              min="0"
              step="0.01"
            />
          </div>
        );
      
      case 'category':
        return (
          <div className="checkbox-grid">
            {expenseCategories.map(category => (
              <CheckboxField
                key={category}
                label={category}
                checked={formData.conditions.categories.includes(category)}
                onChange={(checked) => handleArrayChange('conditions.categories', category, checked)}
              />
            ))}
          </div>
        );
      
      case 'department':
        return (
          <div className="checkbox-grid">
            {departments.map(department => (
              <CheckboxField
                key={department}
                label={department}
                checked={formData.conditions.departments.includes(department)}
                onChange={(checked) => handleArrayChange('conditions.departments', department, checked)}
              />
            ))}
          </div>
        );
      
      case 'hybrid':
        return (
          <div className="hybrid-conditions">
            <div className="conditions-grid">
              <InputField
                label="Minimum Amount ($)"
                type="number"
                value={formData.conditions.minAmount}
                onChange={(value) => handleInputChange('conditions.minAmount', value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <InputField
                label="Maximum Amount ($)"
                type="number"
                value={formData.conditions.maxAmount}
                onChange={(value) => handleInputChange('conditions.maxAmount', value)}
                placeholder="No limit"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="checkbox-section">
              <h4>Categories</h4>
              <div className="checkbox-grid">
                {expenseCategories.map(category => (
                  <CheckboxField
                    key={category}
                    label={category}
                    checked={formData.conditions.categories.includes(category)}
                    onChange={(checked) => handleArrayChange('conditions.categories', category, checked)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return <p>No specific conditions for this rule type.</p>;
    }
  };

  const renderApprovalSettings = () => {
    switch (formData.approvalType) {
      case 'percentage':
        return (
          <div className="approval-settings-grid">
            <InputField
              label="Approval Percentage (%)"
              type="number"
              value={formData.approvalSettings.percentage}
              onChange={(e) => handleInputChange('approvalSettings.percentage', e.target.value)}
              placeholder="50"
              min="1"
              max="100"
              required
            />
            <CheckboxField
              label="Require all approvers to vote"
              checked={formData.approvalSettings.requireAll}
              onChange={(checked) => handleInputChange('approvalSettings.requireAll', checked)}
            />
          </div>
        );
      
      case 'specific':
        return (
          <SelectField
            label="Specific Approver"
            value={formData.approvalSettings.specificApprover}
            onChange={(e) => handleInputChange('approvalSettings.specificApprover', e.target.value)}
            options={availableUsers.map(user => ({
              value: user.id,
              label: `${user.name} (${user.role})`
            }))}
            required
          />
        );
      
      case 'hybrid':
        return (
          <div className="hybrid-approval-settings">
            <div className="approval-settings-grid">
              <InputField
                label="Approval Percentage (%)"
                type="number"
                value={formData.approvalSettings.percentage}
                onChange={(value) => handleInputChange('approvalSettings.percentage', value)}
                placeholder="50"
                min="1"
                max="100"
              />
              <SelectField
                label="OR Specific Approver"
                value={formData.approvalSettings.specificApprover}
                onChange={(value) => handleInputChange('approvalSettings.specificApprover', value)}
                options={availableUsers.map(user => ({
                  value: user.id,
                  label: `${user.name} (${user.role})`
                }))}
                placeholder="Select specific approver"
              />
            </div>
            <p className="help-text">
              Either the percentage of approvers must approve OR the specific approver must approve
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="approval-rule-form">
      {errors.submit && (
        <div className="error-message">{errors.submit}</div>
      )}
      
      {/* Basic Information */}
      <div className="form-section">
        <h3>Basic Information</h3>
        <div className="form-grid">
            <InputField
              label="Rule Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              required
              placeholder="e.g., High Value Expense Approval"
            />          <SelectField
            label="Rule Type"
            value={formData.ruleType}
            onChange={(e) => handleInputChange('ruleType', e.target.value)}
            options={[
              { value: 'amount', label: 'Amount-based' },
              { value: 'category', label: 'Category-based' },
              { value: 'department', label: 'Department-based' },
              { value: 'hybrid', label: 'Hybrid Rule' },
              { value: 'custom', label: 'Custom Rule' }
            ]}
            required
          />
        </div>
        
        <TextAreaField
          label="Description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          error={errors.description}
          required
          placeholder="Describe when this rule should be applied..."
          rows={3}
        />
        
        <div className="form-grid">
            <InputField
              label="Priority"
              type="number"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              min="1"
              help="Lower numbers = higher priority"
            />          <CheckboxField
            label="Active Rule"
            checked={formData.isActive}
            onChange={(checked) => handleInputChange('isActive', checked)}
          />
        </div>
      </div>

      {/* Conditions */}
      <div className="form-section">
        <h3>Rule Conditions</h3>
        {errors.conditions && (
          <div className="error-message">{errors.conditions}</div>
        )}
        {renderConditionsSection()}
      </div>

      {/* Approval Type */}
      <div className="form-section">
        <h3>Approval Type</h3>
        <SelectField
          label="Approval Method"
          value={formData.approvalType}
          onChange={(e) => handleInputChange('approvalType', e.target.value)}
          options={[
            { value: 'sequential', label: 'Sequential Approval (One after another)' },
            { value: 'parallel', label: 'Parallel Approval (All at once)' },
            { value: 'percentage', label: 'Percentage-based Approval' },
            { value: 'specific', label: 'Specific Approver' },
            { value: 'hybrid', label: 'Hybrid (Percentage OR Specific)' }
          ]}
          required
        />
        
        {errors.approvalSettings && (
          <div className="error-message">{errors.approvalSettings}</div>
        )}
        {renderApprovalSettings()}
      </div>

      {/* Approvers (for sequential/parallel) */}
      {(formData.approvalType === 'sequential' || formData.approvalType === 'parallel') && (
        <div className="form-section">
          <div className="approvers-header">
            <h3>Approvers</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addApprover}
            >
              ➕ Add Approver
            </button>
          </div>
          
          {errors.approvers && (
            <div className="error-message">{errors.approvers}</div>
          )}
          
          <div className="approvers-list">
            {formData.approvers.map((approver, index) => (
              <div
                key={approver.id}
                className={`approver-item ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="drag-handle">⋮⋮</div>
                
                <div className="approver-order">
                  {formData.approvalType === 'sequential' ? `Step ${index + 1}` : `Approver ${index + 1}`}
                </div>
                
                <div className="approver-fields">
                  <SelectField
                    label="User"
                    value={approver.userId}
                    onChange={(value) => updateApprover(index, 'userId', value)}
                    options={availableUsers.map(user => ({
                      value: user.id,
                      label: `${user.name} (${user.role})`
                    }))}
                    placeholder="Select user..."
                    required
                  />
                  
                  <SelectField
                    label="Role"
                    value={approver.role}
                    onChange={(value) => updateApprover(index, 'role', value)}
                    options={approverRoles.map(role => ({
                      value: role,
                      label: role
                    }))}
                    placeholder="Select role..."
                  />
                  
                  <CheckboxField
                    label="Required"
                    checked={approver.isRequired}
                    onChange={(checked) => updateApprover(index, 'isRequired', checked)}
                  />
                </div>
                
                <button
                  type="button"
                  className="btn btn-danger btn-sm remove-approver"
                  onClick={() => removeApprover(index)}
                  title="Remove approver"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
          
          {formData.approvers.length === 0 && (
            <div className="empty-approvers">
              <p>No approvers added yet. Click "Add Approver" to start building your approval chain.</p>
            </div>
          )}
        </div>
      )}

      {/* Additional Settings */}
      <div className="form-section">
        <h3>Additional Settings</h3>
        <div className="form-grid">
          <CheckboxField
            label="Allow delegation"
            checked={formData.approvalSettings.allowDelegation}
            onChange={(checked) => handleInputChange('approvalSettings.allowDelegation', checked)}
            help="Approvers can delegate their approval to others"
          />
          
          <InputField
            label="Timeout (hours)"
            type="number"
            value={formData.approvalSettings.timeout}
            onChange={(e) => handleInputChange('approvalSettings.timeout', e.target.value)}
            min="1"
            help="Time limit for approval response"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : (isEdit ? 'Update Rule' : 'Create Rule')}
        </button>
      </div>
    </form>
  );
};

export default ApprovalRuleForm;