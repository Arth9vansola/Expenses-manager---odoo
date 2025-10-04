import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import { LoadingSpinner } from '../components/FormComponents';
import { expenseAPI, formatCurrency, getStatusColor } from '../api/expenses';
import '../styles/dashboard.css';
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

  const handleViewClick = (expense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
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
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">My Expenses</h1>
          <p className="dashboard-subtitle">Welcome back, {user?.name}! Manage your expenses efficiently.</p>
          
          <div className="dashboard-actions">
            <button 
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <span>➕</span>
              Add New Expense
            </button>
          </div>
        </div>

        {notification && (
          <div className={`notification ${notification.type}`}>
            <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : '⚠️'}</span>
            {notification.message}
          </div>
        )}

        {/* Quick Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">📊</div>
            </div>
            <div className="stat-value">{stats.totalExpenses}</div>
            <div className="stat-label">Total Expenses</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">⏳</div>
            </div>
            <div className="stat-value">{stats.pendingCount}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">✅</div>
            </div>
            <div className="stat-value">{stats.approvedCount}</div>
            <div className="stat-label">Approved</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">📝</div>
            </div>
            <div className="stat-value">{stats.draftCount}</div>
            <div className="stat-label">Drafts</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">💰</div>
            </div>
            <div className="stat-value">{formatCurrency(stats.totalAmount, 'USD')}</div>
            <div className="stat-label">Approved Amount</div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">My Expense History</h2>
              <p className="section-subtitle">Track and manage all your expense submissions</p>
            </div>
            <div className="section-content">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <LoadingSpinner size="large" />
                  <p>Loading expenses...</p>
                </div>
              ) : (
                <ExpenseTable 
                  expenses={expenses}
                  onEdit={handleEditClick}
                  onView={handleViewClick}
                  onDelete={handleDeleteExpense}
                  currentUser={user}
                  isManager={false}
                />
              )}
            </div>
          </div>
        </div>
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