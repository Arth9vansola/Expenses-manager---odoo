import React, { useEffect, useRef } from 'react';
import Button from './Button';
import '../styles/states.css';

/**
 * Reusable Modal Component with accessibility features
 * Supports different sizes, custom headers/footers, and backdrop click handling
 */
const Modal = ({
  isOpen = false,
  onClose,
  title = '',
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer = null,
  className = '',
  ...props
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle escape key press
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the modal
      setTimeout(() => {
        const firstFocusableElement = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusableElement?.focus();
      }, 100);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus and scroll
      previousActiveElement.current?.focus();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    onClose?.();
  };

  if (!isOpen) return null;

  // Build CSS classes
  const modalClasses = [
    'modal-content',
    `modal-${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={modalRef}
        className={modalClasses}
        {...props}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                className="modal-close"
                onClick={handleCloseClick}
                aria-label="Close modal"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Confirmation Modal Component
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  ...props
}) => {
  const handleConfirm = () => {
    onConfirm?.();
  };

  const footer = (
    <>
      <Button
        variant="secondary"
        outline
        onClick={onClose}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button
        variant={variant}
        onClick={handleConfirm}
        loading={loading}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={footer}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      {...props}
    >
      <p>{message}</p>
    </Modal>
  );
};

// Info Modal Component
export const InfoModal = ({
  isOpen,
  onClose,
  title = 'Information',
  message = '',
  okText = 'OK',
  ...props
}) => {
  const footer = (
    <Button variant="primary" onClick={onClose}>
      {okText}
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={footer}
      {...props}
    >
      <p>{message}</p>
    </Modal>
  );
};

// Form Modal Component
export const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Form',
  children,
  submitText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  submitDisabled = false,
  ...props
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  const footer = (
    <>
      <Button
        variant="secondary"
        outline
        onClick={onClose}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button
        variant="primary"
        type="submit"
        form="modal-form"
        loading={loading}
        disabled={submitDisabled}
      >
        {submitText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      {...props}
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  );
};

// Size constants
Modal.sizes = {
  small: 'small',
  medium: 'medium',
  large: 'large',
  xlarge: 'xlarge',
  fullscreen: 'fullscreen'
};

export default Modal;