import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import UserTable from '../components/UserTable';
import UserForm from '../components/UserForm';
import { LoadingSpinner } from '../components/FormComponents';
import { userAPI, getAvailableManagers } from '../api/users';
import { approvalAPI } from '../api/approval';
import { expenseAPI, formatCurrency, getStatusColor } from '../api/expenses';
import './AdminDashboard.css';

const AdminDashboard = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, expensesData] = await Promise.all([
        userAPI.getAllUsers(),
        approvalAPI.getTeamExpenses('admin') // Admin can see all expenses
      ]);
      
      setUsers(usersData);
      setAllExpenses(expensesData);
    } catch (error) {
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateUser = async (userData) => {
    try {
      const newUser = await userAPI.createUser(userData);
      setUsers([...users, newUser]);
      setShowCreateModal(false);
      showNotification('User created successfully');
    } catch (error) {
      throw error;
    }
  };

  const handleInviteUser = async (userData) => {
    try {
      await userAPI.sendInvitation(userData.email, userData.role, userData.managerId);
      setShowInviteModal(false);
      showNotification(`Invitation sent to ${userData.email}`);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      const updatedUser = await userAPI.updateUser(userId, userData);
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      showNotification('User updated successfully');
    } catch (error) {
      showNotification('Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    if (window.confirm(`Are you sure you want to delete ${userToDelete.name}?`)) {
      try {
        await userAPI.deleteUser(userToDelete.id);
        setUsers(users.filter(u => u.id !== userToDelete.id));
        showNotification('User deleted successfully');
      } catch (error) {
        showNotification('Failed to delete user', 'error');
      }
    }
  };

  const handleResetPassword = async (userToReset) => {
    if (window.confirm(`Reset password for ${userToReset.name}? They will receive an email with instructions.`)) {
      try {
        await userAPI.resetPassword(userToReset.id);
        showNotification(`Password reset email sent to ${userToReset.email}`);
      } catch (error) {
        showNotification('Failed to reset password', 'error');
      }
    }
  };

  // Expense handling functions
  const handleExpenseClick = (expense) => {
    setSelectedExpense(expense);
    setShowExpenseModal(true);
  };

  const handleOverrideApproval = async (expenseId, action, comment) => {
    try {
      const result = await approvalAPI.processApproval({
        expenseId,
        action,
        comment: comment || 'Admin override',
        approverId: 'admin'
      });
      
      setAllExpenses(allExpenses.map(e => 
        e.id === expenseId ? result : e
      ));
      
      setShowExpenseModal(false);
      setSelectedExpense(null);
      showNotification(`Expense ${action}d successfully`);
    } catch (error) {
      showNotification('Failed to process approval', 'error');
    }
  };

  const availableManagers = getAvailableManagers(users);

  const getStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const managerCount = users.filter(u => u.role === 'manager').length;
    const employeeCount = users.filter(u => u.role === 'employee').length;

    // Expense stats
    const totalExpenses = allExpenses.length;
    const pendingApprovals = allExpenses.filter(e => e.status === 'pending').length;
    const approvedExpenses = allExpenses.filter(e => e.status === 'approved').length;
    const totalApprovedAmount = allExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalUsers,
      activeUsers,
      adminCount,
      managerCount,
      employeeCount,
      totalExpenses,
      pendingApprovals,
      approvedExpenses,
      totalApprovedAmount
    };
  };

  const stats = getStats();

  return (
    <div className="container mt-2">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.name}!</p>
        </div>
        
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management ({stats.totalUsers})
        </button>
        <button 
          className={`tab-button ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expense Oversight ({stats.totalExpenses})
        </button>
        <button 
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Approval Rules
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="admin-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.activeUsers}</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.adminCount}</div>
              <div className="stat-label">Administrators</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.managerCount}</div>
              <div className="stat-label">Managers</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.employeeCount}</div>
              <div className="stat-label">Employees</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalExpenses}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.pendingApprovals}</div>
              <div className="stat-label">Pending Approvals</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{formatCurrency(stats.totalApprovedAmount, 'USD')}</div>
              <div className="stat-label">Approved Amount</div>
            </div>
          </div>

          <div className="overview-cards">
            <div className="card">
              <h3>Quick Actions</h3>
              <div className="quick-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create New User
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowInviteModal(true)}
                >
                  Invite User
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('users')}
                >
                  Manage Users
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Recent Activity</h3>
              <p>Recent user activities and system events will be displayed here.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-users">
          <div className="users-header">
            <h2>User Management</h2>
            <div className="user-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Create User
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowInviteModal(true)}
              >
                📧 Invite User
              </button>
            </div>
          </div>

          <UserTable
            users={users}
            availableManagers={availableManagers}
            onUpdateUser={handleUpdateUser}
            onDelete={handleDeleteUser}
            onResetPassword={handleResetPassword}
            loading={loading}
          />
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="admin-expenses">
          <div className="expenses-header">
            <h2>Expense Oversight</h2>
            <div className="admin-notice">
              <span className="notice-icon">🛡️</span>
              <div>
                <div className="notice-title">Administrative Authority</div>
                <div className="notice-subtitle">You can override any approval decision regardless of the approval chain</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <LoadingSpinner />
              <p>Loading expenses...</p>
            </div>
          ) : allExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No expenses found</h3>
              <p>No expense data is currently available in the system.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-expense-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Current Approver</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allExpenses.map((expense) => (
                    <tr 
                      key={expense.id} 
                      className={`expense-row ${expense.status === 'pending' ? 'pending-row' : ''}`}
                      onClick={() => handleExpenseClick(expense)}
                    >
                      <td>
                        <div className="employee-info">
                          <div className="employee-name">{expense.employeeName}</div>
                          <div className="employee-department">{expense.department}</div>
                        </div>
                      </td>
                      <td>
                        <div className="expense-description">
                          {expense.description}
                          {expense.receiptName && (
                            <span className="receipt-indicator">📎</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">{expense.category}</span>
                      </td>
                      <td>{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="amount-cell">
                        <span className="amount">
                          {formatCurrency(expense.amount, expense.currency)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor(expense.status)}`}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {expense.status === 'pending' && expense.approvalChain ? (
                          <div className="current-approver">
                            {expense.approvalChain.find(a => a.status === 'pending')?.name || 'Unknown'}
                          </div>
                        ) : (
                          <span className="no-approver">-</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                          {expense.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOverrideApproval(expense.id, 'approve', 'Admin override approval');
                                }}
                                title="Admin Override - Approve"
                              >
                                ✓ Override Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const reason = prompt('Rejection reason:');
                                  if (reason) {
                                    handleOverrideApproval(expense.id, 'reject', reason);
                                  }
                                }}
                                title="Admin Override - Reject"
                              >
                                ✗ Override Reject
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-info btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpenseClick(expense);
                            }}
                          >
                            👁 View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="medium"
      >
        <UserForm
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateModal(false)}
          availableManagers={availableManagers}
          isInvitation={false}
        />
      </Modal>

      {/* Invite User Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite New User"
        size="medium"
      >
        <UserForm
          onSubmit={handleInviteUser}
          onCancel={() => setShowInviteModal(false)}
          availableManagers={availableManagers}
          isInvitation={true}
        />
      </Modal>

      {activeTab === 'rules' && (
        <div className="admin-rules">
          <div className="rules-header">
            <h2>Approval Rules Configuration</h2>
            <div className="admin-notice">
              <span className="notice-icon">⚙️</span>
              <div>
                <div className="notice-title">System Configuration</div>
                <div className="notice-subtitle">Configure company-wide expense approval workflows</div>
              </div>
            </div>
          </div>

          <div className="rules-content">
            <div className="rules-overview">
              <div className="rules-stats">
                <div className="stat-card">
                  <div className="stat-number">4</div>
                  <div className="stat-label">Active Rules</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">3</div>
                  <div className="stat-label">Rule Types</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">12</div>
                  <div className="stat-label">Approvers</div>
                </div>
              </div>
              
              <div className="rules-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/admin/approval-rules'}
                >
                  📋 Manage All Rules
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => alert('Rule analytics coming soon!')}
                >
                  📊 View Analytics
                </button>
              </div>
            </div>

            <div className="quick-rules-list">
              <h3>Recent Rules</h3>
              <div className="rules-preview">
                <div className="rule-preview-item">
                  <div className="rule-icon">💰</div>
                  <div className="rule-info">
                    <div className="rule-name">High Value Expense Approval</div>
                    <div className="rule-desc">Expenses over $1000 require multi-level approval</div>
                  </div>
                  <div className="rule-status active">Active</div>
                </div>
                
                <div className="rule-preview-item">
                  <div className="rule-icon">✈️</div>
                  <div className="rule-info">
                    <div className="rule-name">Travel Expense Approval</div>
                    <div className="rule-desc">All travel expenses require manager approval</div>
                  </div>
                  <div className="rule-status active">Active</div>
                </div>
                
                <div className="rule-preview-item">
                  <div className="rule-icon">📱</div>
                  <div className="rule-info">
                    <div className="rule-name">Marketing Department Approval</div>
                    <div className="rule-desc">Marketing expenses over $500 require department head approval</div>
                  </div>
                  <div className="rule-status active">Active</div>
                </div>
              </div>
              
              <div className="view-all-link">
                <a href="/admin/approval-rules">
                  View all rules and detailed configuration →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Expense Details Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setSelectedExpense(null);
        }}
        title="Admin Expense Overview"
        size="large"
      >
        {selectedExpense && (
          <div className="admin-expense-details">
            {/* Expense Summary */}
            <div className="expense-summary-section">
              <h4>Expense Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Employee:</label>
                  <span>{selectedExpense.employeeName} ({selectedExpense.department})</span>
                </div>
                <div className="summary-item">
                  <label>Description:</label>
                  <span>{selectedExpense.description}</span>
                </div>
                <div className="summary-item">
                  <label>Category:</label>
                  <span>{selectedExpense.category}</span>
                </div>
                <div className="summary-item">
                  <label>Date:</label>
                  <span>{new Date(selectedExpense.date).toLocaleDateString()}</span>
                </div>
                <div className="summary-item">
                  <label>Amount:</label>
                  <span className="amount-highlight">
                    {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </span>
                </div>
                <div className="summary-item">
                  <label>Status:</label>
                  <span className={`status-badge ${getStatusColor(selectedExpense.status)}`}>
                    {selectedExpense.status.charAt(0).toUpperCase() + selectedExpense.status.slice(1)}
                  </span>
                </div>
                {selectedExpense.receiptName && (
                  <div className="summary-item">
                    <label>Receipt:</label>
                    <span>📎 {selectedExpense.receiptName}</span>
                  </div>
                )}
                <div className="summary-item">
                  <label>Submitted:</label>
                  <span>
                    {new Date(selectedExpense.submittedAt).toLocaleDateString()} at{' '}
                    {new Date(selectedExpense.submittedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Approval Chain Status */}
            {selectedExpense.approvalChain && selectedExpense.approvalChain.length > 0 && (
              <div className="approval-chain-section">
                <h4>Approval Chain Progress</h4>
                <div className="chain-visualization">
                  {selectedExpense.approvalChain.map((approver, index) => (
                    <div key={index} className={`chain-step ${approver.status}`}>
                      <div className="step-number">{index + 1}</div>
                      <div className="step-info">
                        <div className="step-name">{approver.name}</div>
                        <div className="step-role">{approver.role}</div>
                        <div className={`step-status ${approver.status}`}>
                          {approver.status.charAt(0).toUpperCase() + approver.status.slice(1)}
                        </div>
                      </div>
                      {index < selectedExpense.approvalChain.length - 1 && (
                        <div className="chain-arrow">→</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Approval History */}
            {selectedExpense.approvalHistory && selectedExpense.approvalHistory.length > 0 && (
              <div className="approval-history-section">
                <h4>Complete Approval History</h4>
                <div className="history-list">
                  {selectedExpense.approvalHistory.map((entry, index) => (
                    <div key={index} className={`history-item ${entry.action}`}>
                      <div className="history-timestamp">
                        {new Date(entry.timestamp).toLocaleDateString()} at{' '}
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="history-content">
                        <div className="history-actor">
                          <strong>{entry.approverName}</strong> {entry.action}ed this expense
                        </div>
                        {entry.comment && (
                          <div className="history-comment">
                            <em>"{entry.comment}"</em>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            {selectedExpense.status === 'pending' && (
              <div className="admin-actions-section">
                <h4>Admin Override Actions</h4>
                <div className="admin-warning">
                  <span className="warning-icon">⚠️</span>
                  <div>
                    <div className="warning-title">Administrative Override</div>
                    <div className="warning-subtitle">
                      These actions will bypass the normal approval chain and immediately 
                      finalize the expense status.
                    </div>
                  </div>
                </div>
                <div className="admin-action-buttons">
                  <button
                    className="btn btn-success admin-btn"
                    onClick={() => {
                      const comment = prompt('Optional approval comment:');
                      handleOverrideApproval(
                        selectedExpense.id, 
                        'approve', 
                        comment || 'Admin override approval'
                      );
                    }}
                  >
                    <span className="action-icon">✅</span>
                    <div>
                      <div className="action-title">Override Approve</div>
                      <div className="action-subtitle">Immediately approve this expense</div>
                    </div>
                  </button>
                  <button
                    className="btn btn-danger admin-btn"
                    onClick={() => {
                      const reason = prompt('Rejection reason (required):');
                      if (reason && reason.trim()) {
                        handleOverrideApproval(selectedExpense.id, 'reject', reason);
                      } else {
                        alert('Rejection reason is required for admin override.');
                      }
                    }}
                  >
                    <span className="action-icon">❌</span>
                    <div>
                      <div className="action-title">Override Reject</div>
                      <div className="action-subtitle">Immediately reject this expense</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowExpenseModal(false);
                  setSelectedExpense(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;