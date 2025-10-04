// Form validation utilities using Yup and custom validation logic
// Comprehensive validation for expense management application
import React from 'react';

// Common validation rules
export const validationRules = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minLength: (min) => `Must be at least ${min} characters long`,
  maxLength: (max) => `Must not exceed ${max} characters`,
  minAmount: (min) => `Amount must be at least ${min}`,
  maxAmount: (max) => `Amount must not exceed ${max}`,
  positiveNumber: 'Must be a positive number',
  validDate: 'Please enter a valid date',
  validCurrency: 'Please select a valid currency',
  validCategory: 'Please select a valid category',
  validFile: 'Please upload a valid file',
  maxFileSize: (size) => `File size must not exceed ${size}MB`,
  validImageFormat: 'Please upload a valid image file (JPG, PNG, GIF)',
  validDocumentFormat: 'Please upload a valid document file (PDF, DOC, DOCX)',
  strongPassword: 'Password must contain at least 8 characters, including uppercase, lowercase, and numbers'
};

// Custom validation functions
export const validators = {
  // Email validation
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Strong password validation
  isStrongPassword: (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumbers && hasMinLength;
  },

  // Amount validation
  isValidAmount: (amount) => {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0 && numAmount < 1000000;
  },

  // Date validation
  isValidDate: (date) => {
    const dateObj = new Date(date);
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    return dateObj instanceof Date && !isNaN(dateObj) && 
           dateObj >= oneYearAgo && dateObj <= oneYearFromNow;
  },

  // File validation
  isValidFile: (file, maxSizeMB = 10) => {
    if (!file) return false;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  },

  // Image file validation
  isValidImageFile: (file) => {
    if (!file) return false;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    return validTypes.includes(file.type);
  },

  // Document file validation
  isValidDocumentFile: (file) => {
    if (!file) return false;
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    return validTypes.includes(file.type);
  }
};

// Expense validation schemas
export const expenseValidationSchema = {
  description: {
    required: true,
    minLength: 3,
    maxLength: 200,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return validationRules.required;
      }
      if (value.trim().length < 3) {
        return validationRules.minLength(3);
      }
      if (value.trim().length > 200) {
        return validationRules.maxLength(200);
      }
      return null;
    }
  },

  amount: {
    required: true,
    validate: (value) => {
      if (!value) {
        return validationRules.required;
      }
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return validationRules.positiveNumber;
      }
      if (numValue > 50000) {
        return validationRules.maxAmount(50000);
      }
      return null;
    }
  },

  category: {
    required: true,
    validate: (value) => {
      if (!value) {
        return validationRules.required;
      }
      const validCategories = ['travel', 'meals', 'accommodation', 'transport', 'office', 'equipment', 'other'];
      if (!validCategories.includes(value)) {
        return validationRules.validCategory;
      }
      return null;
    }
  },

  date: {
    required: true,
    validate: (value) => {
      if (!value) {
        return validationRules.required;
      }
      if (!validators.isValidDate(value)) {
        return validationRules.validDate;
      }
      return null;
    }
  },

  currency: {
    required: true,
    validate: (value) => {
      if (!value) {
        return validationRules.required;
      }
      const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CNY', 'BRL'];
      if (!validCurrencies.includes(value)) {
        return validationRules.validCurrency;
      }
      return null;
    }
  },

  receipt: {
    required: false,
    validate: (file) => {
      if (!file) return null; // Receipt is optional
      
      if (!validators.isValidFile(file, 10)) {
        return validationRules.maxFileSize(10);
      }
      if (!validators.isValidDocumentFile(file)) {
        return validationRules.validDocumentFormat;
      }
      return null;
    }
  }
};

// User validation schemas
export const userValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return validationRules.required;
      }
      if (value.trim().length < 2) {
        return validationRules.minLength(2);
      }
      if (value.trim().length > 50) {
        return validationRules.maxLength(50);
      }
      return null;
    }
  },

  email: {
    required: true,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return validationRules.required;
      }
      if (!validators.isValidEmail(value)) {
        return validationRules.email;
      }
      return null;
    }
  },

  password: {
    required: true,
    validate: (value) => {
      if (!value) {
        return validationRules.required;
      }
      if (!validators.isStrongPassword(value)) {
        return validationRules.strongPassword;
      }
      return null;
    }
  },

  confirmPassword: {
    required: true,
    validate: (value, formData) => {
      if (!value) {
        return validationRules.required;
      }
      if (value !== formData.password) {
        return 'Passwords do not match';
      }
      return null;
    }
  },

  role: {
    required: true,
    validate: (value) => {
      if (!value) {
        return validationRules.required;
      }
      const validRoles = ['employee', 'manager', 'admin'];
      if (!validRoles.includes(value)) {
        return 'Please select a valid role';
      }
      return null;
    }
  },

  department: {
    required: true,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return validationRules.required;
      }
      return null;
    }
  }
};

// Approval rule validation schema
export const approvalRuleValidationSchema = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return validationRules.required;
      }
      if (value.trim().length < 3) {
        return validationRules.minLength(3);
      }
      if (value.trim().length > 100) {
        return validationRules.maxLength(100);
      }
      return null;
    }
  },

  description: {
    required: false,
    maxLength: 500,
    validate: (value) => {
      if (value && value.trim().length > 500) {
        return validationRules.maxLength(500);
      }
      return null;
    }
  },

  minAmount: {
    required: true,
    validate: (value) => {
      if (!value && value !== 0) {
        return validationRules.required;
      }
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        return 'Minimum amount must be 0 or greater';
      }
      return null;
    }
  },

  maxAmount: {
    required: true,
    validate: (value, formData) => {
      if (!value) {
        return validationRules.required;
      }
      const numValue = parseFloat(value);
      const minValue = parseFloat(formData.minAmount);
      
      if (isNaN(numValue) || numValue <= 0) {
        return validationRules.positiveNumber;
      }
      if (numValue <= minValue) {
        return 'Maximum amount must be greater than minimum amount';
      }
      if (numValue > 1000000) {
        return validationRules.maxAmount(1000000);
      }
      return null;
    }
  },

  categories: {
    required: true,
    validate: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) {
        return 'Please select at least one category';
      }
      return null;
    }
  },

  approvers: {
    required: true,
    validate: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) {
        return 'Please select at least one approver';
      }
      return null;
    }
  }
};

// Form validation utility class
export class FormValidator {
  constructor(schema) {
    this.schema = schema;
    this.errors = {};
  }

  // Validate a single field
  validateField(fieldName, value, formData = {}) {
    const fieldSchema = this.schema[fieldName];
    if (!fieldSchema) return null;

    // Clear previous error
    delete this.errors[fieldName];

    // Run validation
    const error = fieldSchema.validate(value, formData);
    if (error) {
      this.errors[fieldName] = error;
      return error;
    }
    return null;
  }

  // Validate all fields
  validateForm(formData) {
    this.errors = {};
    let isValid = true;

    Object.keys(this.schema).forEach(fieldName => {
      const error = this.validateField(fieldName, formData[fieldName], formData);
      if (error) {
        isValid = false;
      }
    });

    return { isValid, errors: this.errors };
  }

  // Get error for a specific field
  getFieldError(fieldName) {
    return this.errors[fieldName] || null;
  }

  // Check if form has any errors
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }

  // Clear all errors
  clearErrors() {
    this.errors = {};
  }

  // Clear error for a specific field
  clearFieldError(fieldName) {
    delete this.errors[fieldName];
  }
}

// Validation hook for React components
export const useFormValidation = (schema, initialValues = {}) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validator = new FormValidator(schema);

  const setValue = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate field if it has been touched
    if (touched[name]) {
      const error = validator.validateField(name, value, values);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const setFieldTouched = (name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
    
    if (isTouched) {
      const error = validator.validateField(name, values[name], values);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const validateForm = () => {
    const validation = validator.validateForm(values);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  };

  const handleSubmit = async (onSubmit) => {
    setIsSubmitting(true);
    
    // Touch all fields
    const touchedFields = {};
    Object.keys(schema).forEach(key => {
      touchedFields[key] = true;
    });
    setTouched(touchedFields);
    
    // Validate
    const isValid = validateForm();
    
    if (isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    validateForm,
    resetForm,
    handleSubmit,
    isValid: Object.keys(errors).length === 0
  };
};

// Export validation schemas for easy import
export const validationSchemas = {
  expense: expenseValidationSchema,
  user: userValidationSchema,
  approvalRule: approvalRuleValidationSchema
};

const ValidationSystem = {
  validationRules,
  validators,
  validationSchemas,
  FormValidator,
  useFormValidation
};

export default ValidationSystem;