import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { LoadingSpinner } from '../components/FormComponents';
import { 
  getAllExpenses, 
  approveExpense, 
  rejectExpense,
  formatCurrency, 
  getStatusColor 
} from '../api/expensesLive';
import '../styles/dashboard.css';
import './ManagerDashboard.css';

const ManagerDashboard = ({ user }) => {
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    amountMin: '',
    amountMax: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      console.log('Loading expenses for manager:', user.id);
      
      // Get all expenses and filter for pending and team expenses
      const [pendingResponse, allResponse] = await Promise.all([
        getAllExpenses({ status: 'submitted' }).catch(() => []),
        getAllExpenses({ manager_id: user.id }).catch(() => [])
      ]);
      
      // Handle different response formats
      let pendingData = [];
      if (Array.isArray(pendingResponse)) {
        pendingData = pendingResponse;
      } else if (pendingResponse && pendingResponse.data) {
        pendingData = Array.isArray(pendingResponse.data) ? pendingResponse.data : (pendingResponse.data.results || []);
      } else if (pendingResponse && Array.isArray(pendingResponse.results)) {
        pendingData = pendingResponse.results;
      }
      
      let allData = [];
      if (Array.isArray(allResponse)) {
        allData = allResponse;
      } else if (allResponse && allResponse.data) {
        allData = Array.isArray(allResponse.data) ? allResponse.data : (allResponse.data.results || []);
      } else if (allResponse && Array.isArray(allResponse.results)) {
        allData = allResponse.results;
      }
      
      setPendingExpenses(pendingData);
      setAllExpenses(allData);
      
      console.log('Manager expenses loaded - Pending:', pendingData.length, 'All:', allData.length);
    } catch (error) {
      console.error('Error loading manager expenses:', error);
      showNotification('Failed to load expenses', 'error');
      setPendingExpenses([]);
      setAllExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleExpenseClick = (expense) => {
    setSelectedExpense(expense);
    setShowApprovalModal(true);
  };

  const handleApprovalAction = (action) => {
    setApprovalAction(action);
    if (action === 'approve') {
      setApprovalComment('');
    }
  };

  const submitApproval = async () => {
    if (approvalAction === 'reject' && !approvalComment.trim()) {
      showNotification('Rejection reason is required', 'error');
      return;
    }

    try {
      const approvalData = {
        expenseId: selectedExpense.id,
        action: approvalAction,
        comment: approvalComment.trim(),
        approverId: user.id
      };

      let result;
      
      if (approvalAction === 'approve') {
        result = await approveExpense(selectedExpense.id, approvalComment.trim());
      } else {
        result = await rejectExpense(selectedExpense.id, approvalComment.trim());
      }
      
      if (result.success) {
        // Update local state with array safety
        setPendingExpenses((prevExpenses) => {
          const safeExpenses = Array.isArray(prevExpenses) ? prevExpenses : [];
          return safeExpenses.filter(e => e.id !== selectedExpense.id);
        });
        
        // Update all expenses list with array safety
        setAllExpenses((prevExpenses) => {
          const safeExpenses = Array.isArray(prevExpenses) ? prevExpenses : [];
          return safeExpenses.map(e => 
            e.id === selectedExpense.id ? { ...e, ...result.data } : e
          );
        });
        
        console.log('Approval processed successfully:', result.data);
      } else {
        throw new Error(result.error || 'Failed to process approval');
      }

      setShowApprovalModal(false);
      setSelectedExpense(null);
      setApprovalAction(null);
      setApprovalComment('');

      const actionText = approvalAction === 'approve' ? 'approved' : 'rejected';
      showNotification(`Expense ${actionText} successfully`);
      
    } catch (error) {
      console.error('Error processing approval:', error);
      showNotification('Failed to process approval', 'error');
    }
  };

  const getManagerStats = () => {
    // Ensure arrays are valid before processing
    const safePendingExpenses = Array.isArray(pendingExpenses) ? pendingExpenses : [];
    const safeAllExpenses = Array.isArray(allExpenses) ? allExpenses : [];
    
    const pendingCount = safePendingExpenses.length;
    const pendingAmount = safePendingExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthlyExpenses = safeAllExpenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === thisMonth && expenseDate.getFullYear() === thisYear;
    });
    
    const monthlyApproved = monthlyExpenses.filter(e => e.status === 'approved');
    const monthlyAmount = monthlyApproved.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    return {
      pendingCount,
      pendingAmount,
      monthlyCount: monthlyApproved.length,
      monthlyAmount,
      teamSize: new Set(safeAllExpenses.map(e => e.employeeId)).size
    };
  };

  const getFilteredExpenses = (expenses) => {
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    return safeExpenses.filter(expense => {
      const matchesSearch = !filters.search || 
        expense.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        expense.employeeName.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesCategory = !filters.category || expense.category === filters.category;
      
      const matchesAmount = (!filters.amountMin || expense.amount >= parseFloat(filters.amountMin)) &&
                           (!filters.amountMax || expense.amount <= parseFloat(filters.amountMax));
      
      const expenseDate = new Date(expense.date);
      const matchesDateFrom = !filters.dateFrom || expenseDate >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || expenseDate <= new Date(filters.dateTo);
      
      return matchesSearch && matchesCategory && matchesAmount && matchesDateFrom && matchesDateTo;
    });
  };

  const stats = getManagerStats();
  const currentExpenses = activeTab === 'pending' ? pendingExpenses : allExpenses;
  const filteredExpenses = getFilteredExpenses(currentExpenses);

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Approval Dashboard</h1>
          <p className="dashboard-subtitle">Welcome, {user?.name} - Manage team expense approvals efficiently</p>
        </div>

        {notification && (
          <div className={`notification ${notification.type}`}>
            <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : '⚠️'}</span>
            {notification.message}
          </div>
        )}

        {/* Manager Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">⚡</div>
            </div>
            <div className="stat-value">{stats.pendingCount}</div>
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-change positive">
              <span>🔥</span>
              Urgent
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">💰</div>
            </div>
            <div className="stat-value">{formatCurrency(stats.pendingAmount, 'USD')}</div>
            <div className="stat-label">Pending Amount</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">✅</div>
            </div>
            <div className="stat-value">{stats.monthlyCount}</div>
            <div className="stat-label">Approved This Month</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">📊</div>
            </div>
            <div className="stat-value">{formatCurrency(stats.monthlyAmount, 'USD')}</div>
            <div className="stat-label">Monthly Total</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">👥</div>
            </div>
            <div className="stat-value">{stats.teamSize}</div>
            <div className="stat-label">Team Members</div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-section">
            <div className="dashboard-tabs">
              <button 
                className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Pending Approvals ({stats.pendingCount})
              </button>
              <button 
                className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Team Expenses
              </button>
            </div>
            
            <div className="section-content">
              {stats.pendingCount > 0 && activeTab === 'pending' && (
                <div className="notification warning" style={{ margin: '0 0 1rem 0' }}>
                  <span>⚠️</span>
                  {stats.pendingCount} expense{stats.pendingCount !== 1 ? 's' : ''} awaiting your approval
                </div>
              )}

              {/* Filters */}
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--background-alt)', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Search by description or employee..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                  
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  >
                    <option value="">All Categories</option>
                    <option value="travel">Travel</option>
                    <option value="meals">Meals</option>
                    <option value="office">Office Supplies</option>
                    <option value="transport">Transport</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="other">Other</option>
                  </select>
                  
                  <input
                    type="number"
                    placeholder="Min Amount"
                    value={filters.amountMin}
                    onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                  
                  <input
                    type="number"
                    placeholder="Max Amount"
                    value={filters.amountMax}
                    onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                  
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                  
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                
                <button 
                  onClick={() => setFilters({
                    search: '', category: '', amountMin: '', amountMax: '', dateFrom: '', dateTo: ''
                  })}
                  className="btn-secondary"
                  style={{ marginTop: '1rem' }}
                >
                  Clear Filters
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <LoadingSpinner size="large" />
                  <p>Loading expenses...</p>
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                  <h3>No expenses found</h3>
                  <p>
                    {activeTab === 'pending' 
                      ? "No expenses are currently pending your approval." 
                      : "No expenses match your current filters."}
                  </p>
                </div>
              ) : (
            <div className="table-responsive">
              <table className="approval-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Approval Chain</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr 
                      key={expense.id} 
                      className={`expense-row ${expense.priority === 'urgent' ? 'urgent' : ''}`}
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
                        <div className="approval-chain">
                          {expense.approvalChain?.map((approver, index) => (
                            <span 
                              key={index}
                              className={`approver ${approver.status}`}
                              title={`${approver.name || 'Unknown'} - ${approver.status}`}
                            >
                              {approver.name ? approver.name.split(' ').map(n => n[0] || '').join('') : '??'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                          {expense.status === 'pending' && expense.currentApproverId === user.id && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedExpense(expense);
                                  setApprovalAction('approve');
                                  setShowApprovalModal(true);
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedExpense(expense);
                                  setApprovalAction('reject');
                                  setShowApprovalModal(true);
                                }}
                              >
                                ✗ Reject
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
                            👁 View
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
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedExpense(null);
          setApprovalAction(null);
          setApprovalComment('');
        }}
        title="Expense Approval"
        size="large"
      >
        {selectedExpense && (
          <div className="approval-modal">
            {/* Expense Details */}
            <div className="expense-details-section">
              <h4>Expense Details</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Employee:</label>
                  <span>{selectedExpense.employeeName} ({selectedExpense.department})</span>
                </div>
                <div className="detail-item">
                  <label>Description:</label>
                  <span>{selectedExpense.description}</span>
                </div>
                <div className="detail-item">
                  <label>Category:</label>
                  <span>{selectedExpense.category}</span>
                </div>
                <div className="detail-item">
                  <label>Date:</label>
                  <span>{new Date(selectedExpense.date).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Amount:</label>
                  <span className="amount-highlight">
                    {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge ${getStatusColor(selectedExpense.status)}`}>
                    {selectedExpense.status.charAt(0).toUpperCase() + selectedExpense.status.slice(1)}
                  </span>
                </div>
                {selectedExpense.receiptName && (
                  <div className="detail-item">
                    <label>Receipt:</label>
                    <span>📎 {selectedExpense.receiptName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Approval History */}
            {selectedExpense.approvalHistory && selectedExpense.approvalHistory.length > 0 && (
              <div className="approval-history-section">
                <h4>Approval History</h4>
                <div className="history-timeline">
                  {(Array.isArray(selectedExpense.approvalHistory) ? selectedExpense.approvalHistory : []).map((entry, index) => (
                    <div key={index} className={`history-entry ${entry.action}`}>
                      <div className="history-icon">
                        {entry.action === 'approve' ? '✓' : entry.action === 'reject' ? '✗' : '👁'}
                      </div>
                      <div className="history-content">
                        <div className="history-header">
                          <span className="approver-name">{entry.approverName}</span>
                          <span className="history-date">
                            {new Date(entry.timestamp).toLocaleDateString()} at{' '}
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="history-action">
                          {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}ed this expense
                        </div>
                        {entry.comment && (
                          <div className="history-comment">"{entry.comment}"</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval Actions */}
            {selectedExpense.status === 'pending' && selectedExpense.currentApproverId === user.id && (
              <div className="approval-actions-section">
                <h4>Take Action</h4>
                <div className="action-buttons-large">
                  <button
                    className={`btn btn-success action-btn ${approvalAction === 'approve' ? 'selected' : ''}`}
                    onClick={() => handleApprovalAction('approve')}
                  >
                    <span className="action-icon">✓</span>
                    <div>
                      <div className="action-title">Approve</div>
                      <div className="action-subtitle">Move to next approver or mark as approved</div>
                    </div>
                  </button>
                  <button
                    className={`btn btn-danger action-btn ${approvalAction === 'reject' ? 'selected' : ''}`}
                    onClick={() => handleApprovalAction('reject')}
                  >
                    <span className="action-icon">✗</span>
                    <div>
                      <div className="action-title">Reject</div>
                      <div className="action-subtitle">Send back to employee with comments</div>
                    </div>
                  </button>
                </div>

                {/* Comment Section */}
                <div className="comment-section">
                  <label htmlFor="approval-comment">
                    {approvalAction === 'reject' ? 'Rejection Reason *' : 'Comment (Optional)'}
                  </label>
                  <textarea
                    id="approval-comment"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder={
                      approvalAction === 'reject' 
                        ? "Please provide a reason for rejection..."
                        : "Add any comments or notes..."
                    }
                    rows="4"
                    className="comment-textarea"
                  />
                </div>

                <div className="modal-actions">
                  <button
                    className="btn btn-primary"
                    onClick={submitApproval}
                    disabled={!approvalAction || (approvalAction === 'reject' && !approvalComment.trim())}
                  >
                    {approvalAction === 'approve' ? 'Approve Expense' : 'Reject Expense'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowApprovalModal(false);
                      setSelectedExpense(null);
                      setApprovalAction(null);
                      setApprovalComment('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* View Only Mode */}
            {(selectedExpense.status !== 'pending' || selectedExpense.currentApproverId !== user.id) && (
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedExpense(null);
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ManagerDashboard;