import React from 'react';
import { useFormValidation } from '../utils/validation';
import Button from './Button';
import '../styles/states.css';

/**
 * Reusable Form Field Component with validation
 */
export const FormField = ({
  label,
  name,
  type = 'text',
  value = '',
  onChange,
  onBlur,
  error = null,
  success = false,
  required = false,
  disabled = false,
  placeholder = '',
  options = [], // for select fields
  children, // for custom field content
  className = '',
  fieldClassName = '',
  labelClassName = '',
  inputClassName = '',
  helpText = '',
  ...props
}) => {
  const fieldId = `field-${name}`;
  const hasError = Boolean(error);

  const handleChange = (e) => {
    const newValue = type === 'checkbox' ? e.target.checked : e.target.value;
    onChange?.(newValue, name, e);
  };

  const handleBlur = (e) => {
    onBlur?.(name, e);
  };

  // Build CSS classes
  const fieldClasses = [
    'form-field',
    hasError && 'error',
    success && 'success',
    disabled && 'disabled',
    fieldClassName
  ].filter(Boolean).join(' ');

  const inputClasses = [
    'form-input',
    hasError && 'error',
    success && 'success',
    inputClassName
  ].filter(Boolean).join(' ');

  const renderInput = () => {
    const commonProps = {
      id: fieldId,
      name,
      value,
      onChange: handleChange,
      onBlur: handleBlur,
      disabled,
      className: inputClasses,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined,
      ...props
    };

    switch (type) {
      case 'select':
        return (
          <select {...commonProps}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map(option => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea 
            {...commonProps}
            placeholder={placeholder}
            rows={props.rows || 4}
          />
        );

      case 'checkbox':
        return (
          <div className="checkbox-wrapper">
            <input
              {...commonProps}
              type="checkbox"
              checked={value}
              className={`checkbox-input ${inputClassName}`}
            />
            <label htmlFor={fieldId} className="checkbox-label">
              {label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="radio-group">
            {options.map(option => (
              <div key={option.value} className="radio-wrapper">
                <input
                  id={`${fieldId}-${option.value}`}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={disabled || option.disabled}
                  className="radio-input"
                />
                <label 
                  htmlFor={`${fieldId}-${option.value}`}
                  className="radio-label"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'file':
        return (
          <input
            {...commonProps}
            type="file"
            placeholder={undefined}
          />
        );

      default:
        return (
          <input
            {...commonProps}
            type={type}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    <div className={`${fieldClasses} ${className}`}>
      {/* Label (except for checkbox which renders its own) */}
      {label && type !== 'checkbox' && (
        <label 
          htmlFor={fieldId}
          className={`form-label ${labelClassName}`}
        >
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}

      {/* Input Field */}
      {children || renderInput()}

      {/* Help Text */}
      {helpText && !hasError && (
        <div id={`${fieldId}-help`} className="form-help-text">
          {helpText}
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div id={`${fieldId}-error`} className="form-field-error">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && !hasError && (
        <div className="form-field-success">
          Valid
        </div>
      )}
    </div>
  );
};

/**
 * Reusable Form Component with validation
 */
const Form = ({
  children,
  onSubmit,
  validationSchema = null,
  initialValues = {},
  className = '',
  ...props
}) => {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    handleSubmit,
    resetForm
  } = useFormValidation(validationSchema, initialValues);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit((formValues) => {
      onSubmit?.(formValues, { resetForm });
    });
  };

  // Enhanced children with validation props
  const enhancedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child) && child.type === FormField) {
      const fieldName = child.props.name;
      
      return React.cloneElement(child, {
        value: values[fieldName] || child.props.value || '',
        error: touched[fieldName] ? errors[fieldName] : null,
        onChange: (value, name) => {
          setValue(name, value);
          child.props.onChange?.(value, name);
        },
        onBlur: (name) => {
          setFieldTouched(name, true);
          child.props.onBlur?.(name);
        }
      });
    }
    return child;
  });

  return (
    <form 
      className={`form ${className}`}
      onSubmit={handleFormSubmit}
      noValidate
      {...props}
    >
      {enhancedChildren}
    </form>
  );
};

/**
 * Form Section Component for organizing fields
 */
export const FormSection = ({
  title,
  description,
  children,
  className = '',
  ...props
}) => (
  <div className={`form-section ${className}`} {...props}>
    {title && <h3 className="form-section-title">{title}</h3>}
    {description && <p className="form-section-description">{description}</p>}
    <div className="form-section-content">
      {children}
    </div>
  </div>
);

/**
 * Form Actions Component for submit/cancel buttons
 */
export const FormActions = ({
  children,
  submitText = 'Submit',
  cancelText = 'Cancel',
  onCancel,
  loading = false,
  submitDisabled = false,
  className = '',
  ...props
}) => (
  <div className={`form-actions ${className}`} {...props}>
    {children || (
      <>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            outline
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={submitDisabled}
        >
          {submitText}
        </Button>
      </>
    )}
  </div>
);

/**
 * Field Group Component for related fields
 */
export const FieldGroup = ({
  legend,
  children,
  className = '',
  ...props
}) => (
  <fieldset className={`field-group ${className}`} {...props}>
    {legend && <legend className="field-group-legend">{legend}</legend>}
    <div className="field-group-content">
      {children}
    </div>
  </fieldset>
);

export default Form;