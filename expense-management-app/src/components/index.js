// Reusable Components Export Index
// Centralized exports for all reusable components

// Re-import for default export
import ButtonComponent from './Button';
import ModalComponent, { ConfirmModal as ConfirmModalComponent, InfoModal as InfoModalComponent, FormModal as FormModalComponent } from './Modal';
import TableComponent, { Pagination as PaginationComponent } from './Table';
import LoaderComponent, { Spinner as SpinnerComponent, SkeletonLoader as SkeletonLoaderComponent, ProgressBar as ProgressBarComponent, LoadingDots as LoadingDotsComponent, PulseLoader as PulseLoaderComponent } from './Loader';
import FormComponent, { FormField as FormFieldComponent, FormSection as FormSectionComponent, FormActions as FormActionsComponent, FieldGroup as FieldGroupComponent } from './Form';
import { useFormValidation as useFormValidationHook, FormValidator as FormValidatorClass, validationSchemas as validationSchemasObject, validationRules as validationRulesObject, validators as validatorsObject } from '../utils/validation';
import ToastSystemImport, { ToastProvider as ToastProviderComponent, useToast as useToastHook, withToast as withToastHOC, Alert as AlertComponent, ProgressToast as ProgressToastComponent } from './Toast';

// Core Components
export { default as Button } from './Button';
export { default as Modal, ConfirmModal, InfoModal, FormModal } from './Modal';
export { default as Table, Pagination } from './Table';
export { default as Loader, Spinner, SkeletonLoader, ProgressBar, LoadingDots, PulseLoader } from './Loader';

// Form Components
export { default as Form, FormField, FormSection, FormActions, FieldGroup } from './Form';

// Notification Components
export { default as Toast, ToastProvider, useToast, withToast, Alert, ProgressToast } from './Toast';

// Re-export validation utilities for convenience
export { 
  useFormValidation,
  FormValidator,
  validationSchemas,
  validationRules,
  validators
} from '../utils/validation';

// Component constants for easy reference
export const ComponentSizes = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  XLARGE: 'xlarge'
};

export const ComponentVariants = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  DANGER: 'danger',
  WARNING: 'warning',
  INFO: 'info',
  LIGHT: 'light',
  DARK: 'dark'
};

export const ModalSizes = {
  SMALL: 'small',
  MEDIUM: 'medium', 
  LARGE: 'large',
  XLARGE: 'xlarge',
  FULLSCREEN: 'fullscreen'
};

// Utility functions for components
export const componentUtils = {
  // Generate CSS classes helper
  generateClasses: (baseClass, modifiers = [], customClass = '') => {
    const classes = [baseClass];
    
    modifiers.forEach(modifier => {
      if (modifier) {
        classes.push(`${baseClass}--${modifier}`);
      }
    });
    
    if (customClass) {
      classes.push(customClass);
    }
    
    return classes.filter(Boolean).join(' ');
  },

  // Format display text helper
  formatDisplayText: (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  },

  // Generate unique ID helper
  generateId: (prefix = 'component') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Debounce function for form inputs
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format file size helper
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Validate file type helper
  isValidFileType: (file, allowedTypes) => {
    if (!file || !allowedTypes) return false;
    return allowedTypes.includes(file.type);
  },

  // Safe JSON parse helper
  safeJsonParse: (json, defaultValue = null) => {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.warn('Invalid JSON:', json);
      return defaultValue;
    }
  }
};

// Export everything as default object for convenience
const Components = {
  Button: ButtonComponent,
  Modal: ModalComponent,
  ConfirmModal: ConfirmModalComponent,
  InfoModal: InfoModalComponent,
  FormModal: FormModalComponent,
  Table: TableComponent,
  Pagination: PaginationComponent,
  Loader: LoaderComponent,
  Spinner: SpinnerComponent,
  SkeletonLoader: SkeletonLoaderComponent,
  ProgressBar: ProgressBarComponent,
  LoadingDots: LoadingDotsComponent,
  PulseLoader: PulseLoaderComponent,
  Form: FormComponent,
  FormField: FormFieldComponent,
  FormSection: FormSectionComponent,
  FormActions: FormActionsComponent,
  FieldGroup: FieldGroupComponent,
  useFormValidation: useFormValidationHook,
  FormValidator: FormValidatorClass,
  validationSchemas: validationSchemasObject,
  validationRules: validationRulesObject,
  validators: validatorsObject,
  Toast: ToastSystemImport,
  ToastProvider: ToastProviderComponent,
  useToast: useToastHook,
  withToast: withToastHOC,
  Alert: AlertComponent,
  ProgressToast: ProgressToastComponent,
  ComponentSizes,
  ComponentVariants,
  ModalSizes,
  componentUtils
};

export default Components;