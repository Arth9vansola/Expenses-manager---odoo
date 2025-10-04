import React, { useState } from 'react';
import { FormInput, FormSelect, LoadingSpinner } from './FormComponents';
import { validateEmail, validateRequired } from '../api/validation';

const UserForm = ({ 
  onSubmit, 
  onCancel, 
  availableManagers, 
  isInvitation = false,
  initialData = null 
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: initialData?.role || 'employee',
    managerId: initialData?.managerId || '',
    status: initialData?.status || 'active'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!validateRequired(formData.name)) {
      newErrors.name = 'Name is required';
    }

    if (!validateRequired(formData.email)) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!validateRequired(formData.role)) {
      newErrors.role = 'Role is required';
    }

    // Manager is required for employees and managers (not for admin)
    if (formData.role !== 'admin' && !formData.managerId) {
      newErrors.managerId = 'Manager assignment is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Add manager name to form data
      let managerName = null;
      if (formData.managerId) {
        const manager = availableManagers.find(m => m.id === formData.managerId);
        managerName = manager?.name || null;
      }

      const submitData = {
        ...formData,
        manager_id: formData.managerId || null,  // Send as UUID string, not integer
        managerName
      };
      
      // Remove the camelCase managerId to avoid confusion
      delete submitData.managerId;

      await onSubmit(submitData);
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save user' });
    } finally {
      setLoading(false);
    }
  };

  const managerOptions = (availableManagers || []).map(manager => ({
    value: manager.id,
    label: manager.name
  }));

  const roleOptions = [
    { value: 'employee', label: 'Employee' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <FormInput
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        required
        disabled={loading}
        placeholder="Enter full name"
      />

      <FormInput
        label="Email Address"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        required
        disabled={loading}
        placeholder="Enter email address"
      />

      <FormSelect
        label="Role"
        name="role"
        value={formData.role}
        onChange={handleChange}
        error={errors.role}
        options={roleOptions}
        required
        disabled={loading}
      />

      {formData.role !== 'admin' && (
        <div className="form-group">
          <FormSelect
            label="Report to Manager *"
            name="managerId"
            value={formData.managerId}
            onChange={handleChange}
            error={errors.managerId}
            options={[
              { value: '', label: 'Select a manager...' },
              ...managerOptions
            ]}
            required
            disabled={loading || managerOptions.length === 0}
            helpText={
              managerOptions.length === 0 
                ? "No managers available. Create an admin or manager user first."
                : `Choose a manager for this ${formData.role}. Required for employees and managers.`
            }
          />
          {managerOptions.length === 0 && (
            <div className="form-warning">
              ⚠️ No managers or admins are available to assign. You may need to create an admin or manager user first.
            </div>
          )}
        </div>
      )}

      {!isInvitation && (
        <FormSelect
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          error={errors.status}
          options={statusOptions}
          required
          disabled={loading}
        />
      )}

      {errors.submit && (
        <div className="error-banner">
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoadingSpinner size="small" />
              {isInvitation ? 'Sending Invitation...' : 'Saving...'}
            </>
          ) : (
            isInvitation ? 'Send Invitation' : 'Save User'
          )}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UserForm;