import React from 'react';
import '../styles/states.css';

/**
 * Reusable Button Component with multiple variants and states
 * Supports loading, disabled states, and different styling variants
 */
const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  outline = false,
  fullWidth = false,
  icon = null,
  iconPosition = 'left',
  onClick,
  className = '',
  ...props
}) => {
  // Build CSS classes
  const classes = [
    'btn',
    `btn-${variant}`,
    outline && 'btn-outline',
    size !== 'medium' && `btn-${size}`,
    fullWidth && 'btn-full-width',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  // Handle click events
  const handleClick = (e) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon btn-icon-left">{icon}</span>
      )}
      
      {!loading && <span className="btn-text">{children}</span>}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon btn-icon-right">{icon}</span>
      )}
      
      {loading && (
        <span className="btn-loading-content">
          <span className="loading-spinner"></span>
          <span>{typeof loading === 'string' ? loading : 'Loading...'}</span>
        </span>
      )}
    </button>
  );
};

// Button size variants
Button.sizes = {
  small: 'small',
  medium: 'medium',
  large: 'large'
};

// Button variants
Button.variants = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  light: 'light',
  dark: 'dark'
};

export default Button;