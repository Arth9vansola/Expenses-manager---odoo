// Responsive Expense Table Component
import React, { useState, useMemo } from 'react';
import '../styles/responsive.css';

const ResponsiveExpenseTable = ({
  expenses = [],
  onExpenseClick,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  currentUser,
  loading = false,
  error = null,
  isOffline = false
}) => {
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    if (!expenses.length) return [];

    const sorted = [...expenses].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle different data types
      if (sortBy === 'amount') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortBy === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply status filter
    if (filterStatus !== 'all') {
      return sorted.filter(expense => expense.status === filterStatus);
    }

    return sorted;
  }, [expenses, sortBy, sortOrder, filterStatus]);

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch {
      return `$${parseFloat(amount).toFixed(2)}`;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Check if user can perform actions
  const canEdit = (expense) => {
    return expense.submitterId === currentUser?.id || currentUser?.role === 'admin';
  };

  const canApprove = (expense) => {
    return (currentUser?.role === 'manager' || currentUser?.role === 'admin') && 
           expense.status === 'pending';
  };

  // Render loading state
  if (loading) {
    return (
      <div className="expense-table-container">
        <div className="table-loading">
          <div className="loading-spinner">🔄</div>
          <p>Loading expenses...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="expense-table-container">
        <div className="table-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!sortedExpenses.length) {
    return (
      <div className="expense-table-container">
        <div className="table-empty">
          <div className="empty-icon">💸</div>
          <h3>No expenses found</h3>
          <p>Start by submitting your first expense.</p>
          <button className="btn-primary">
            ➕ Submit Expense
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-table-container">
      {/* Table Header */}
      <div className="table-header">
        <div className="table-controls">
          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button 
              className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              📱 Cards
            </button>
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📋 Table
            </button>
          </div>

          {/* Status Filter */}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Offline Indicator */}
        {isOffline && (
          <div className="offline-indicator">
            📶 Viewing offline data
          </div>
        )}
      </div>

      {/* Cards View (Mobile-First) */}
      {viewMode === 'cards' && (
        <div className="expense-cards">
          {sortedExpenses.map(expense => (
            <div 
              key={expense.id} 
              className="expense-card"
              onClick={() => onExpenseClick?.(expense)}
            >
              <div className="card-header">
                <div className="card-title">
                  <h3>{expense.title || expense.description}</h3>
                  <span className={`status-badge ${getStatusColor(expense.status)}`}>
                    {expense.status}
                  </span>
                </div>
                <div className="card-amount">
                  {formatCurrency(expense.amount, expense.currency)}
                </div>
              </div>

              <div className="card-details">
                <div className="detail-row">
                  <span className="detail-label">📅 Date:</span>
                  <span>{formatDate(expense.date)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">🏷️ Category:</span>
                  <span>{expense.category}</span>
                </div>
                {expense.merchant && (
                  <div className="detail-row">
                    <span className="detail-label">🏪 Merchant:</span>
                    <span>{expense.merchant}</span>
                  </div>
                )}
                {expense.submitterName && (
                  <div className="detail-row">
                    <span className="detail-label">👤 Submitted by:</span>
                    <span>{expense.submitterName}</span>
                  </div>
                )}
              </div>

              {expense.receiptUrl && (
                <div className="card-receipt">
                  <span className="receipt-indicator">📎 Receipt attached</span>
                </div>
              )}

              <div className="card-actions">
                {canEdit(expense) && (
                  <button 
                    className="action-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(expense);
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
                
                {canApprove(expense) && (
                  <>
                    <button 
                      className="action-btn approve"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove?.(expense);
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      className="action-btn reject"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject?.(expense);
                      }}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}

                {canEdit(expense) && (
                  <button 
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this expense?')) {
                        onDelete?.(expense);
                      }
                    }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View (Desktop) */}
      {viewMode === 'table' && (
        <div className="expense-table-wrapper">
          <table className="expense-table">
            <thead>
              <tr>
                <th 
                  className={`sortable ${sortBy === 'title' ? `sorted ${sortOrder}` : ''}`}
                  onClick={() => handleSort('title')}
                >
                  Title
                  <span className="sort-indicator">
                    {sortBy === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </th>
                <th 
                  className={`sortable ${sortBy === 'amount' ? `sorted ${sortOrder}` : ''}`}
                  onClick={() => handleSort('amount')}
                >
                  Amount
                  <span className="sort-indicator">
                    {sortBy === 'amount' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </th>
                <th 
                  className={`sortable ${sortBy === 'category' ? `sorted ${sortOrder}` : ''}`}
                  onClick={() => handleSort('category')}
                >
                  Category
                  <span className="sort-indicator">
                    {sortBy === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </th>
                <th 
                  className={`sortable ${sortBy === 'date' ? `sorted ${sortOrder}` : ''}`}
                  onClick={() => handleSort('date')}
                >
                  Date
                  <span className="sort-indicator">
                    {sortBy === 'date' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </th>
                <th 
                  className={`sortable ${sortBy === 'status' ? `sorted ${sortOrder}` : ''}`}
                  onClick={() => handleSort('status')}
                >
                  Status
                  <span className="sort-indicator">
                    {sortBy === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map(expense => (
                <tr 
                  key={expense.id}
                  className="expense-row"
                  onClick={() => onExpenseClick?.(expense)}
                >
                  <td className="title-cell">
                    <div className="expense-title">{expense.title || expense.description}</div>
                    {expense.merchant && (
                      <div className="expense-merchant">{expense.merchant}</div>
                    )}
                    {expense.receiptUrl && (
                      <div className="receipt-indicator">📎</div>
                    )}
                  </td>
                  <td className="amount-cell">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="category-cell">{expense.category}</td>
                  <td className="date-cell">{formatDate(expense.date)}</td>
                  <td className="status-cell">
                    <span className={`status-badge ${getStatusColor(expense.status)}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      {canEdit(expense) && (
                        <button 
                          className="action-btn edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(expense);
                          }}
                          title="Edit expense"
                        >
                          ✏️
                        </button>
                      )}
                      
                      {canApprove(expense) && (
                        <>
                          <button 
                            className="action-btn approve"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApprove?.(expense);
                            }}
                            title="Approve expense"
                          >
                            ✅
                          </button>
                          <button 
                            className="action-btn reject"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReject?.(expense);
                            }}
                            title="Reject expense"
                          >
                            ❌
                          </button>
                        </>
                      )}

                      {canEdit(expense) && (
                        <button 
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this expense?')) {
                              onDelete?.(expense);
                            }
                          }}
                          title="Delete expense"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer */}
      <div className="table-footer">
        <div className="results-count">
          Showing {sortedExpenses.length} expense{sortedExpenses.length !== 1 ? 's' : ''}
          {filterStatus !== 'all' && ` (${filterStatus})`}
        </div>
        
        <div className="total-amount">
          Total: {formatCurrency(
            sortedExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0)
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveExpenseTable;