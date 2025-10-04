import React, { useState, useMemo } from 'react';
import Button from './Button';
import { SkeletonLoader } from './Loader';
import '../styles/states.css';

/**
 * Reusable Table Component with sorting, pagination, and selection
 * Supports loading states, empty states, and custom cell rendering
 */
const Table = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  sortable = true,
  selectable = false,
  pagination = null,
  emptyMessage = 'No data available',
  errorMessage = 'Failed to load data',
  onSort = null,
  onSelect = null,
  onRowClick = null,
  selectedRows = [],
  className = '',
  ...props
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sort data locally if onSort is not provided
  const sortedData = useMemo(() => {
    if (!sortable || !sortConfig.key || onSort) return data;

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, sortable, onSort]);

  // Handle sort
  const handleSort = (key) => {
    if (!sortable) return;

    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });

    if (onSort) {
      onSort(key, direction);
    }
  };

  // Handle row selection
  const handleRowSelect = (row, isSelected) => {
    if (!selectable || !onSelect) return;
    onSelect(row, isSelected);
  };

  // Handle select all
  const handleSelectAll = (isSelected) => {
    if (!selectable || !onSelect) return;
    onSelect(isSelected ? sortedData : [], isSelected);
  };

  // Check if row is selected
  const isRowSelected = (row) => {
    return selectedRows.some(selectedRow => 
      selectedRow.id === row.id || selectedRow === row
    );
  };

  // Check if all rows are selected
  const isAllSelected = sortedData.length > 0 && 
    sortedData.every(row => isRowSelected(row));

  const isIndeterminate = selectedRows.length > 0 && !isAllSelected;

  // Get nested value from object
  function getNestedValue(obj, path) {
    return path.split('.').reduce((value, key) => value?.[key], obj);
  }

  // Render table header
  const renderHeader = () => (
    <thead>
      <tr>
        {selectable && (
          <th className="table-select-header">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={checkbox => {
                if (checkbox) checkbox.indeterminate = isIndeterminate;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
          </th>
        )}
        {columns.map((column) => (
          <th
            key={column.key || column.dataIndex}
            className={`table-header ${sortable && column.sortable !== false ? 'sortable' : ''}`}
            onClick={() => column.sortable !== false && handleSort(column.key || column.dataIndex)}
            style={{ width: column.width }}
          >
            <div className="table-header-content">
              <span>{column.title}</span>
              {sortable && column.sortable !== false && (
                <span className="sort-indicator">
                  {sortConfig.key === (column.key || column.dataIndex) ? (
                    sortConfig.direction === 'asc' ? '↑' : '↓'
                  ) : '↕'}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  // Render table body
  const renderBody = () => {
    if (loading) {
      return (
        <tbody>
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={index}>
              {selectable && <td><SkeletonLoader width={20} height={20} /></td>}
              {columns.map((column, colIndex) => (
                <td key={colIndex}>
                  <SkeletonLoader />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      );
    }

    if (error) {
      return (
        <tbody>
          <tr>
            <td 
              colSpan={columns.length + (selectable ? 1 : 0)} 
              className="table-error"
            >
              <div>
                <p>{errorMessage}</p>
                <Button 
                  size="small" 
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (sortedData.length === 0) {
      return (
        <tbody>
          <tr>
            <td 
              colSpan={columns.length + (selectable ? 1 : 0)} 
              className="table-empty"
            >
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {sortedData.map((row, rowIndex) => {
          const isSelected = isRowSelected(row);
          
          return (
            <tr
              key={row.id || rowIndex}
              className={`table-row ${isSelected ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {selectable && (
                <td className="table-select-cell">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRowSelect(row, e.target.checked);
                    }}
                  />
                </td>
              )}
              {columns.map((column) => {
                const cellKey = column.key || column.dataIndex;
                const cellValue = getNestedValue(row, cellKey);
                
                return (
                  <td 
                    key={cellKey}
                    className={`table-cell ${column.className || ''}`}
                    style={column.cellStyle}
                  >
                    {column.render ? 
                      column.render(cellValue, row, rowIndex) : 
                      cellValue
                    }
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    );
  };

  // Build CSS classes
  const tableClasses = [
    'table',
    loading && 'loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="table-wrapper" {...props}>
      <table className={tableClasses}>
        {renderHeader()}
        {renderBody()}
      </table>
      
      {pagination && (
        <div className="table-pagination">
          {pagination}
        </div>
      )}
    </div>
  );
};

// Pagination Component
export const Pagination = ({
  current = 1,
  pageSize = 10,
  total = 0,
  showSizeChanger = true,
  showQuickJumper = false,
  showTotal = true,
  pageSizeOptions = [10, 20, 50, 100],
  onChange = () => {},
  onShowSizeChange = () => {},
  className = '',
  ...props
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (current - 1) * pageSize + 1;
  const endItem = Math.min(current * pageSize, total);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== current) {
      onChange(page, pageSize);
    }
  };

  const handleSizeChange = (newSize) => {
    const newPage = Math.ceil(((current - 1) * pageSize + 1) / newSize);
    onShowSizeChange(newPage, newSize);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages.map((page, index) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${index}`} className="pagination-ellipsis">
            ...
          </span>
        );
      }

      return (
        <button
          key={page}
          className={`pagination-page ${page === current ? 'active' : ''}`}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </button>
      );
    });
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`pagination ${className}`} {...props}>
      {showTotal && (
        <div className="pagination-total">
          Showing {startItem} to {endItem} of {total} items
        </div>
      )}

      <div className="pagination-controls">
        <Button
          size="small"
          variant="secondary"
          outline
          disabled={current === 1}
          onClick={() => handlePageChange(1)}
        >
          First
        </Button>

        <Button
          size="small"
          variant="secondary" 
          outline
          disabled={current === 1}
          onClick={() => handlePageChange(current - 1)}
        >
          Previous
        </Button>

        <div className="pagination-pages">
          {renderPageNumbers()}
        </div>

        <Button
          size="small"
          variant="secondary"
          outline
          disabled={current === totalPages}
          onClick={() => handlePageChange(current + 1)}
        >
          Next
        </Button>

        <Button
          size="small"
          variant="secondary"
          outline
          disabled={current === totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          Last
        </Button>
      </div>

      {showSizeChanger && (
        <div className="pagination-size-changer">
          <select
            value={pageSize}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      )}

      {showQuickJumper && (
        <div className="pagination-quick-jumper">
          Go to{' '}
          <input
            type="number"
            min="1"
            max={totalPages}
            onPressEnter={(e) => {
              const page = Number(e.target.value);
              if (page >= 1 && page <= totalPages) {
                handlePageChange(page);
                e.target.value = '';
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Table;