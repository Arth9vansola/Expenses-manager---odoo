import React from 'react';
import './FormComponents.css';

export const FormInput = ({ 
  label, 
  error, 
  required = false, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <input
        className={`form-input ${error ? 'error' : ''}`}
        {...props}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export const FormSelect = ({ 
  label, 
  error, 
  required = false, 
  options = [], 
  className = '', 
  helpText = '',
  ...props 
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <select
        className={`form-input ${error ? 'error' : ''}`}
        {...props}
      >
        {options.length > 0 && options[0].value !== '' && (
          <option value="">Select {label}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helpText && !error && <span className="help-text">{helpText}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export const LoadingSpinner = ({ size = 'medium' }) => {
  return (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner"></div>
    </div>
  );
};

export const FormTextArea = ({ 
  label, 
  error, 
  required = false, 
  className = '', 
  rows = 3,
  ...props 
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <textarea
        className={`form-input ${error ? 'error' : ''}`}
        rows={rows}
        {...props}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export const FormCheckbox = ({ 
  label, 
  error, 
  checked, 
  onChange, 
  className = '', 
  help,
  ...props 
}) => {
  return (
    <div className={`form-group checkbox-group ${className}`}>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="checkbox-input"
          {...props}
        />
        <span className="checkbox-text">{label}</span>
      </label>
      {help && <div className="help-text">{help}</div>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export const PasswordStrength = ({ password, strength, message }) => {
  if (!password) return null;
  
  return (
    <div className="password-strength">
      <div className="strength-bar">
        <div 
          className={`strength-fill ${message.toLowerCase()}`}
          style={{ width: `${strength}%` }}
        ></div>
      </div>
      <span className={`strength-text ${message.toLowerCase()}`}>
        {message}
      </span>
    </div>
  );
};