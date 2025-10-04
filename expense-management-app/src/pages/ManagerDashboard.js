import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { LoadingSpinner } from '../components/FormComponents';
import { expenseAPI, formatCurrency, getStatusColor } from '../api/expenses';
import { approvalAPI } from '../api/approval';
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
      // Get expenses pending approval for this manager
      const managerId = user.id || user.userId || '2'; // Fallback to manager user
      const [pending, all] = await Promise.all([
        approvalAPI.getPendingApprovals(managerId).catch(() => []),
        approvalAPI.getTeamExpenses(managerId).catch(() => [])
      ]);
      
      setPendingExpenses(pending || []);
      setAllExpenses(all || []);
    } catch (error) {
      console.error('Error loading manager expenses:', error);
      showNotification('Failed to load expenses. Using fallback data.', 'error');
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

      const result = await approvalAPI.processApproval(approvalData);
      
      // Update local state
      setPendingExpenses(pendingExpenses.filter(e => e.id !== selectedExpense.id));
      
      // Update all expenses list
      setAllExpenses(allExpenses.map(e => 
        e.id === selectedExpense.id ? { ...e, ...result } : e
      ));

      setShowApprovalModal(false);
      setSelectedExpense(null);
      setApprovalAction(null);
      setApprovalComment('');

      const actionText = approvalAction === 'approve' ? 'approved' : 'rejected';
      showNotification(`Expense ${actionText} successfully`);
      
    } catch (error) {
      showNotification('Failed to process approval', 'error');
    }
  };

  const getManagerStats = () => {
    const pendingCount = pendingExpenses.length;
    const pendingAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthlyExpenses = allExpenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === thisMonth && expenseDate.getFullYear() === thisYear;
    });
    
    const monthlyApproved = monthlyExpenses.filter(e => e.status === 'approved');
    const monthlyAmount = monthlyApproved.reduce((sum, e) => sum + e.amount, 0);
    
    return {
      pendingCount,
      pendingAmount,
      monthlyCount: monthlyApproved.length,
      monthlyAmount,
      teamSize: new Set(allExpenses.map(e => e.employeeId)).size
    };
  };

  const getFilteredExpenses = (expenses) => {
    return expenses.filter(expense => {
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
    <div className="container mt-2">
      <div className="manager-header">
        <div>
          <h1>Approval Dashboard</h1>
          <p>Welcome, {user?.name} - {user?.role}</p>
        </div>
        
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>

      {/* Manager Stats */}
      <div className="stats-grid">
        <div className="stat-card urgent">
          <div className="stat-number">{stats.pendingCount}</div>
          <div className="stat-label">Pending Approvals</div>
        </div>
        <div className="stat-card amount">
          <div className="stat-number">{formatCurrency(stats.pendingAmount, 'USD')}</div>
          <div className="stat-label">Pending Amount</div>
        </div>
        <div className="stat-card success">
          <div className="stat-number">{stats.monthlyCount}</div>
          <div className="stat-label">Approved This Month</div>
        </div>
        <div className="stat-card info">
          <div className="stat-number">{formatCurrency(stats.monthlyAmount, 'USD')}</div>
          <div className="stat-label">Monthly Total</div>
        </div>
        <div className="stat-card team">
          <div className="stat-number">{stats.teamSize}</div>
          <div className="stat-label">Team Members</div>
        </div>
      </div>

      {/* Approval Queue */}
      <div className="approval-section">
        <div className="section-header">
          <div className="tab-navigation">
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
          
          {stats.pendingCount > 0 && activeTab === 'pending' && (
            <div className="urgent-notice">
              ⚠️ {stats.pendingCount} expense{stats.pendingCount !== 1 ? 's' : ''} awaiting your approval
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-grid">
            <input
              type="text"
              placeholder="Search by description or employee..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="filter-input"
            />
            
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="filter-select"
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
              className="filter-input"
            />
            
            <input
              type="number"
              placeholder="Max Amount"
              value={filters.amountMax}
              onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
              className="filter-input"
            />
            
            <input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="filter-input"
            />
            
            <input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="filter-input"
            />
          </div>
          
          <button 
            onClick={() => setFilters({
              search: '', category: '', amountMin: '', amountMax: '', dateFrom: '', dateTo: ''
            })}
            className="btn btn-secondary clear-filters"
          >
            Clear Filters
          </button>
        </div>

        {/* Expense Table */}
        <div className="approval-table-container">
          {loading ? (
            <div className="loading-container">
              <LoadingSpinner />
              <p>Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
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
                              title={`${approver.name} - ${approver.status}`}
                            >
                              {approver.name.split(' ').map(n => n[0]).join('')}
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
                  {selectedExpense.approvalHistory.map((entry, index) => (
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