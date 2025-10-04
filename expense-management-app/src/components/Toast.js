import React, { createContext, useContext, useState, useCallback } from 'react';
import '../styles/states.css';

/**
 * Toast/Notification System
 * Provides global toast notifications with different types and auto-dismiss
 */

const ToastContext = createContext();

// Toast Provider Component
export const ToastProvider = ({ children, position = 'top-right' }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [removeToast]);



  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'success' });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'error', duration: 8000 });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'warning' });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'info' });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} position={position} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, position, onClose }) => {
  if (toasts.length === 0) return null;

  const positionClasses = {
    'top-right': 'toast-container-top-right',
    'top-left': 'toast-container-top-left',
    'bottom-right': 'toast-container-bottom-right',
    'bottom-left': 'toast-container-bottom-left',
    'top-center': 'toast-container-top-center',
    'bottom-center': 'toast-container-bottom-center'
  };

  return (
    <div className={`toast-container ${positionClasses[position] || positionClasses['top-right']}`}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
};

// Individual Toast Component
const Toast = ({ toast, onClose }) => {
  const { type, title, message, actions, closable = true } = toast;

  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <div className="toast-icon">
          {typeIcons[type] || typeIcons.info}
        </div>
        
        <div className="toast-body">
          {title && <div className="toast-title">{title}</div>}
          <div className="toast-message">{message}</div>
          
          {actions && (
            <div className="toast-actions">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className={`toast-action-btn ${action.variant || 'primary'}`}
                  onClick={() => {
                    action.onClick?.();
                    if (action.closeOnClick !== false) {
                      onClose();
                    }
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {closable && (
          <button className="toast-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// Hook to use toast system
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// HOC to provide toast functionality
export const withToast = (Component) => {
  return function ToastWrappedComponent(props) {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
};

// Alert Component (simpler than toast)
export const Alert = ({
  type = 'info',
  title,
  message,
  closable = false,
  onClose,
  actions = [],
  className = '',
  ...props
}) => {
  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`alert alert-${type} ${className}`} {...props}>
      <div className="alert-icon">
        {typeIcons[type] || typeIcons.info}
      </div>
      
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-message">{message}</div>
        
        {actions.length > 0 && (
          <div className="alert-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`alert-action-btn btn btn-${action.variant || 'primary'} btn-small`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {closable && (
        <button className="alert-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

// Progress Toast for long operations
export const ProgressToast = ({
  progress = 0,
  message = 'Processing...',
  type = 'info',
  onCancel,
  ...props
}) => {
  return (
    <div className={`toast toast-progress toast-${type}`} {...props}>
      <div className="toast-content">
        <div className="toast-body">
          <div className="toast-message">{message}</div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="progress-text">
            {Math.round(progress)}%
          </div>
        </div>
        
        {onCancel && (
          <button className="toast-close" onClick={onCancel}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

const ToastSystem = {
  ToastProvider,
  useToast,
  withToast,
  Alert,
  Toast,
  ProgressToast
};

export default ToastSystem;