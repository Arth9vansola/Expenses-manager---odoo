import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import { LoadingSpinner } from '../components/FormComponents';
import { expenseAPI, formatCurrency, getStatusColor } from '../api/expenses';
import './EmployeeDashboard.css';

const EmployeeDashboard = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const expensesData = await expenseAPI.getExpenses(user.id);
      setExpenses(expensesData);
    } catch (error) {
      showNotification('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddExpense = async (expenseData) => {
    try {
      const newExpense = await expenseAPI.createExpense(expenseData);
      setExpenses([newExpense, ...expenses]);
      setShowAddModal(false);
      showNotification('Expense saved as draft successfully');
    } catch (error) {
      throw error;
    }
  };

  const handleEditExpense = async (expenseData) => {
    try {
      const updatedExpense = await expenseAPI.updateExpense(selectedExpense.id, expenseData);
      setExpenses(expenses.map(e => e.id === selectedExpense.id ? updatedExpense : e));
      setShowEditModal(false);
      setSelectedExpense(null);
      showNotification('Expense updated successfully');
    } catch (error) {
      throw error;
    }
  };

  const handleViewExpense = (expense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const handleEditClick = (expense) => {
    setSelectedExpense(expense);
    setShowEditModal(true);
  };

  const handleDeleteExpense = async (expense) => {
    if (window.confirm(`Are you sure you want to delete "${expense.description}"?`)) {
      try {
        await expenseAPI.deleteExpense(expense.id);
        setExpenses(expenses.filter(e => e.id !== expense.id));
        showNotification('Expense deleted successfully');
      } catch (error) {
        showNotification('Failed to delete expense', 'error');
      }
    }
  };

  const handleSubmitExpense = async (expense) => {
    if (window.confirm(`Submit "${expense.description}" for approval?`)) {
      try {
        const submittedExpense = await expenseAPI.submitExpense(expense.id);
        setExpenses(expenses.map(e => e.id === expense.id ? submittedExpense : e));
        showNotification('Expense submitted for approval');
      } catch (error) {
        showNotification('Failed to submit expense', 'error');
      }
    }
  };

  const getExpenseStats = () => {
    const totalExpenses = expenses.length;
    const draftCount = expenses.filter(e => e.status === 'draft').length;
    const pendingCount = expenses.filter(e => e.status === 'pending').length;
    const approvedCount = expenses.filter(e => e.status === 'approved').length;
    const rejectedCount = expenses.filter(e => e.status === 'rejected').length;
    
    const totalAmount = expenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const pendingAmount = expenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalExpenses,
      draftCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalAmount,
      pendingAmount
    };
  };

  const stats = getExpenseStats();

  return (
    <div className="container mt-2">
      <div className="employee-header">
        <div>
          <h1>My Expenses</h1>
          <p>Welcome back, {user?.name}!</p>
        </div>
        
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalExpenses}</div>
          <div className="stat-label">Total Expenses</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-number">{stats.pendingCount}</div>
          <div className="stat-label">Pending Approval</div>
        </div>
        <div className="stat-card success">
          <div className="stat-number">{stats.approvedCount}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card draft">
          <div className="stat-number">{stats.draftCount}</div>
          <div className="stat-label">Drafts</div>
        </div>
        <div className="stat-card amount">
          <div className="stat-number">{formatCurrency(stats.totalAmount, 'USD')}</div>
          <div className="stat-label">Approved Amount</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="card">
          <h3>Quick Actions</h3>
          <div className="action-buttons-grid">
            <button 
              className="btn btn-primary action-button"
              onClick={() => setShowAddModal(true)}
            >
              <span className="action-icon">➕</span>
              <div>
                <div className="action-title">Add New Expense</div>
                <div className="action-subtitle">Create and save as draft</div>
              </div>
            </button>
            
            <button 
              className="btn btn-secondary action-button"
              onClick={() => {
                const drafts = expenses.filter(e => e.status === 'draft');
                if (drafts.length > 0) {
                  handleEditClick(drafts[0]);
                } else {
                  showNotification('No draft expenses found', 'info');
                }
              }}
            >
              <span className="action-icon">📝</span>
              <div>
                <div className="action-title">Continue Draft</div>
                <div className="action-subtitle">{stats.draftCount} drafts available</div>
              </div>
            </button>

            {stats.pendingAmount > 0 && (
              <div className="pending-alert">
                <span className="alert-icon">⏳</span>
                <div>
                  <div className="alert-title">Pending Approval</div>
                  <div className="alert-subtitle">
                    {formatCurrency(stats.pendingAmount, 'USD')} awaiting approval
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="expense-list">
        <div className="list-header">
          <h3>My Expense History</h3>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            Add Expense
          </button>
        </div>

        <ExpenseTable
          expenses={expenses}
          onView={handleViewExpense}
          onEdit={handleEditClick}
          onDelete={handleDeleteExpense}
          onSubmit={handleSubmitExpense}
          loading={loading}
        />
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Expense"
        size="large"
      >
        <ExpenseForm
          onSubmit={handleAddExpense}
          onCancel={() => setShowAddModal(false)}
          userCompany={user?.company}
          isEdit={false}
        />
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedExpense(null);
        }}
        title="Edit Expense"
        size="large"
      >
        <ExpenseForm
          onSubmit={handleEditExpense}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedExpense(null);
          }}
          userCompany={user?.company}
          initialData={selectedExpense}
          isEdit={true}
        />
      </Modal>

      {/* View Expense Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedExpense(null);
        }}
        title="Expense Details"
        size="medium"
      >
        {selectedExpense && (
          <div className="expense-details">
            <div className="detail-row">
              <label>Description:</label>
              <span>{selectedExpense.description}</span>
            </div>
            <div className="detail-row">
              <label>Category:</label>
              <span>{selectedExpense.category}</span>
            </div>
            <div className="detail-row">
              <label>Date:</label>
              <span>{new Date(selectedExpense.date).toLocaleDateString()}</span>
            </div>
            <div className="detail-row">
              <label>Amount:</label>
              <span className="amount-highlight">
                {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
              </span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${getStatusColor(selectedExpense.status)}`}>
                {selectedExpense.status.charAt(0).toUpperCase() + selectedExpense.status.slice(1)}
              </span>
            </div>
            {selectedExpense.approver && (
              <div className="detail-row">
                <label>Current Approver:</label>
                <span>{selectedExpense.approver}</span>
              </div>
            )}
            {selectedExpense.rejectionReason && (
              <div className="detail-row">
                <label>Rejection Reason:</label>
                <span className="rejection-reason">{selectedExpense.rejectionReason}</span>
              </div>
            )}
            {selectedExpense.receiptName && (
              <div className="detail-row">
                <label>Receipt:</label>
                <span>📎 {selectedExpense.receiptName}</span>
              </div>
            )}
            
            <div className="modal-actions">
              {(selectedExpense.status === 'draft' || selectedExpense.status === 'rejected') && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditClick(selectedExpense);
                  }}
                >
                  Edit Expense
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowViewModal(false);
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

export default EmployeeDashboard;