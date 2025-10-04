import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import { LoadingSpinner } from '../components/FormComponents';
import { 
  getAllExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  submitExpense,
  formatCurrency, 
  getStatusColor 
} from '../api/expensesLive';
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
      console.log('Loading expenses for user:', user.id);
      
      // Get expenses for the current user
      const response = await getAllExpenses({ user_id: user.id });
      
      if (response.success) {
        const expenseData = response.data.results || response.data;
        setExpenses(Array.isArray(expenseData) ? expenseData : []);
        console.log('Expenses loaded:', response.data);
      } else {
        throw new Error(response.error || 'Failed to load expenses');
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
      showNotification('Failed to load expenses', 'error');
      setExpenses([]); // Ensure expenses is always an array
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
      console.log('Creating expense:', expenseData);
      
      const response = await createExpense(expenseData);
      
      if (response.success) {
        setExpenses([response.data, ...expenses]);
        setShowAddModal(false);
        showNotification('Expense saved as draft successfully');
        console.log('Expense created:', response.data);
      } else {
        throw new Error(response.error || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  };

  const handleEditExpense = async (expenseData) => {
    try {
      console.log('Updating expense:', selectedExpense.id, expenseData);
      
      const response = await updateExpense(selectedExpense.id, expenseData);
      
      if (response.success) {
        setExpenses((prevExpenses) => {
          const safeExpenses = Array.isArray(prevExpenses) ? prevExpenses : [];
          return safeExpenses.map(e => e.id === selectedExpense.id ? response.data : e);
        });
        setShowEditModal(false);
        setSelectedExpense(null);
        showNotification('Expense updated successfully');
        console.log('Expense updated:', response.data);
      } else {
        throw new Error(response.error || 'Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
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
        console.log('Deleting expense:', expense.id);
        
        const response = await deleteExpense(expense.id);
        
        if (response.success) {
          setExpenses((prevExpenses) => {
            const safeExpenses = Array.isArray(prevExpenses) ? prevExpenses : [];
            return safeExpenses.filter(e => e.id !== expense.id);
          });
          showNotification('Expense deleted successfully');
          console.log('Expense deleted successfully');
        } else {
          throw new Error(response.error || 'Failed to delete expense');
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('Failed to delete expense', 'error');
      }
    }
  };

  const handleSubmitExpense = async (expense) => {
    if (window.confirm(`Submit "${expense.description}" for approval?`)) {
      try {
        console.log('Submitting expense for approval:', expense.id);
        
        const response = await submitExpense(expense.id);
        
        if (response.success) {
          setExpenses((prevExpenses) => {
            const safeExpenses = Array.isArray(prevExpenses) ? prevExpenses : [];
            return safeExpenses.map(e => e.id === expense.id ? response.data : e);
          });
          showNotification('Expense submitted for approval');
          console.log('Expense submitted successfully:', response.data);
        } else {
          throw new Error(response.error || 'Failed to submit expense');
        }
      } catch (error) {
        console.error('Error submitting expense:', error);
        showNotification('Failed to submit expense', 'error');
      }
    }
  };

  const getExpenseStats = () => {
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const totalExpenses = safeExpenses.length;
    const draftCount = safeExpenses.filter(e => e.status === 'draft').length;
    const pendingCount = safeExpenses.filter(e => e.status === 'pending').length;
    const approvedCount = safeExpenses.filter(e => e.status === 'approved').length;
    const rejectedCount = safeExpenses.filter(e => e.status === 'rejected').length;
    
    const totalAmount = safeExpenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    const pendingAmount = safeExpenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

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