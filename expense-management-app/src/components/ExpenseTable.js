import React, { useState, useMemo } from 'react';
import { LoadingSpinner } from './FormComponents';
import { getStatusColor, formatCurrency, formatDate } from '../api/expenses';
import './ExpenseTable.css';

const ExpenseTable = ({ 
  expenses, 
  onView, 
  onEdit, 
  onDelete, 
  onSubmit,
  loading 
}) => {
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });

  // Filter and sort expenses
  const filteredAndSortedExpenses = useMemo(() => {
    let filtered = expenses.filter(expense => {
      const matchesStatus = !filters.status || expense.status === filters.status;
      const matchesSearch = !filters.search || 
        expense.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        expense.category.toLowerCase().includes(filters.search.toLowerCase());
      
      let matchesDate = true;
      if (filters.dateFrom) {
        matchesDate = matchesDate && new Date(expense.date) >= new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        matchesDate = matchesDate && new Date(expense.date) <= new Date(filters.dateTo);
      }

      return matchesStatus && matchesSearch && matchesDate;
    });

    // Sort expenses
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'amount') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        } else if (sortConfig.key === 'date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [expenses, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getStatusBadge = (status) => {
    const color = getStatusColor(status);
    return (
      <span className={`status-badge ${color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="table-loading">
        <LoadingSpinner size="large" />
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="expense-table-container">
      {/* Filters */}
      <div className="table-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search description or category..."
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="filter-input"
            />
          </div>

          <button onClick={clearFilters} className="btn btn-secondary clear-filters">
            Clear Filters
          </button>
        </div>

        <div className="results-info">
          Showing {filteredAndSortedExpenses.length} of {expenses.length} expenses
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="expense-table">
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('description')}
                className="sortable"
              >
                Description {getSortIcon('description')}
              </th>
              <th 
                onClick={() => handleSort('category')}
                className="sortable"
              >
                Category {getSortIcon('category')}
              </th>
              <th 
                onClick={() => handleSort('date')}
                className="sortable"
              >
                Date {getSortIcon('date')}
              </th>
              <th 
                onClick={() => handleSort('amount')}
                className="sortable"
              >
                Amount {getSortIcon('amount')}
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="sortable"
              >
                Status {getSortIcon('status')}
              </th>
              <th>Approver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedExpenses.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  {filters.status || filters.search || filters.dateFrom || filters.dateTo
                    ? 'No expenses match your filters'
                    : 'No expenses found. Create your first expense!'}
                </td>
              </tr>
            ) : (
              filteredAndSortedExpenses.map(expense => (
                <tr key={expense.id}>
                  <td>
                    <div className="expense-description">
                      <div className="description-text">{expense.description}</div>
                      {expense.receiptName && (
                        <div className="receipt-indicator">
                          📎 {expense.receiptName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{expense.category}</td>
                  <td>{formatDate(expense.date)}</td>
                  <td className="amount-cell">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td>{getStatusBadge(expense.status)}</td>
                  <td>{expense.approver || '—'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => onView(expense)}
                        className="btn-icon view"
                        title="View details"
                      >
                        👁️
                      </button>
                      
                      {expense.status === 'draft' && (
                        <>
                          <button
                            onClick={() => onEdit(expense)}
                            className="btn-icon edit"
                            title="Edit expense"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => onSubmit(expense)}
                            className="btn-icon submit"
                            title="Submit for approval"
                          >
                            📤
                          </button>
                          <button
                            onClick={() => onDelete(expense)}
                            className="btn-icon delete"
                            title="Delete expense"
                          >
                            🗑️
                          </button>
                        </>
                      )}

                      {expense.status === 'rejected' && (
                        <button
                          onClick={() => onEdit(expense)}
                          className="btn-icon edit"
                          title="Edit and resubmit"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseTable;