import React, { useState } from 'react';
import { FormInput, FormSelect, LoadingSpinner } from './FormComponents';
import './UserTable.css';

const UserTable = ({ 
  users, 
  onEdit, 
  onDelete, 
  onResetPassword, 
  onUpdateUser,
  availableManagers,
  loading 
}) => {
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleEditStart = (user) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId || '',
      status: user.status
    });
  };

  const handleEditCancel = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleEditSave = async () => {
    try {
      await onUpdateUser(editingUser, editForm);
      setEditingUser(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleEditChange = (field, value) => {
    setEditForm({
      ...editForm,
      [field]: value
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'role-badge admin';
      case 'manager': return 'role-badge manager';
      case 'employee': return 'role-badge employee';
      default: return 'role-badge';
    }
  };

  const getStatusBadgeClass = (status) => {
    return `status-badge ${status}`;
  };

  const managerOptions = availableManagers.map(manager => ({
    value: manager.id,
    label: manager.name
  }));

  if (loading) {
    return (
      <div className="table-loading">
        <LoadingSpinner size="large" />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-table-container">
      <div className="table-responsive">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={editingUser === user.id ? 'editing' : ''}>
                <td>
                  {editingUser === user.id ? (
                    <FormInput
                      value={editForm.name}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      className="inline-edit"
                    />
                  ) : (
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                    </div>
                  )}
                </td>
                
                <td>
                  {editingUser === user.id ? (
                    <FormInput
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditChange('email', e.target.value)}
                      className="inline-edit"
                    />
                  ) : (
                    user.email
                  )}
                </td>
                
                <td>
                  {editingUser === user.id ? (
                    <FormSelect
                      value={editForm.role}
                      onChange={(e) => handleEditChange('role', e.target.value)}
                      options={[
                        { value: 'admin', label: 'Admin' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'employee', label: 'Employee' }
                      ]}
                      className="inline-edit"
                    />
                  ) : (
                    <span className={getRoleBadgeClass(user.role)}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  )}
                </td>
                
                <td>
                  {editingUser === user.id ? (
                    <FormSelect
                      value={editForm.managerId}
                      onChange={(e) => handleEditChange('managerId', e.target.value)}
                      options={managerOptions}
                      className="inline-edit"
                    />
                  ) : (
                    <span className="manager-name">
                      {user.managerName || user.manager?.name || '—'}
                    </span>
                  )}
                </td>
                
                <td>
                  {editingUser === user.id ? (
                    <FormSelect
                      value={editForm.status}
                      onChange={(e) => handleEditChange('status', e.target.value)}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' }
                      ]}
                      className="inline-edit"
                    />
                  ) : (
                    <span className={getStatusBadgeClass(user.status)}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  )}
                </td>
                
                <td>{user.createdAt}</td>
                <td>{user.lastLogin || 'Never'}</td>
                
                <td>
                  <div className="action-buttons">
                    {editingUser === user.id ? (
                      <>
                        <button
                          onClick={handleEditSave}
                          className="btn-icon save"
                          title="Save changes"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="btn-icon cancel"
                          title="Cancel editing"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStart(user)}
                          className="btn-icon edit"
                          title="Edit user"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onResetPassword(user)}
                          className="btn-icon reset"
                          title="Reset password"
                        >
                          🔑
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => onDelete(user)}
                            className="btn-icon delete"
                            title="Delete user"
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;