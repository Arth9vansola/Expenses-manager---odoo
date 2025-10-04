// Mobile-Optimized Expense Form Component
import React, { useState, useEffect } from 'react';
import { useImageUpload } from '../utils/imageUpload';
import { offlineStorage } from '../utils/offlineStorage';
import '../styles/responsive.css';

const MobileExpenseForm = ({ 
  expense = null, 
  onSubmit, 
  onCancel,
  isOffline = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    currency: 'USD',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receiptFile: null,
    merchant: '',
    location: '',
    tags: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const { 
    processImage, 
    processing: imageProcessing, 
    validateFile 
  } = useImageUpload();

  // Load form data if editing
  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title || '',
        amount: expense.amount?.toString() || '',
        currency: expense.currency || 'USD',
        category: expense.category || '',
        date: expense.date || new Date().toISOString().split('T')[0],
        description: expense.description || '',
        receiptFile: null,
        merchant: expense.merchant || '',
        location: expense.location || '',
        tags: expense.tags || []
      });
    }
  }, [expense]);

  // Load categories and currencies
  useEffect(() => {
    const loadFormData = async () => {
      try {
        const cachedCategories = await offlineStorage.getData('expense_categories', [
          'Travel', 'Meals', 'Office Supplies', 'Software', 'Training', 
          'Marketing', 'Equipment', 'Entertainment', 'Utilities', 'Other'
        ]);
        
        const cachedCurrencies = await offlineStorage.getData('currencies', [
          { code: 'USD', symbol: '$' },
          { code: 'EUR', symbol: '€' },
          { code: 'GBP', symbol: '£' },
          { code: 'CAD', symbol: 'C$' }
        ]);

        setCategories(cachedCategories);
        setCurrencies(cachedCurrencies);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    };

    loadFormData();
  }, []);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setErrors(prev => ({
        ...prev,
        receipt: validation.errors.join(', ')
      }));
      return;
    }

    try {
      const result = await processImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8
      });

      setFormData(prev => ({
        ...prev,
        receiptFile: result.processedBlob,
        receiptPreview: result.dataUrl
      }));

      // Clear any previous errors
      setErrors(prev => ({
        ...prev,
        receipt: null
      }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        receipt: error.message
      }));
    }
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    setShowCamera(true);
  };

  // Handle tag addition
  const addTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      handleInputChange('tags', [...formData.tags, tag]);
    }
  };

  // Handle tag removal
  const removeTag = (tagToRemove) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = document.querySelector('.form-group.error input, .form-group.error select');
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        id: expense?.id || null
      };

      await onSubmit(submitData);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to submit expense'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mobile-expense-form">
      {/* Header */}
      <div className="form-header">
        <button className="back-btn" onClick={onCancel}>
          ← Back
        </button>
        <h2>{expense ? 'Edit Expense' : 'New Expense'}</h2>
        {isOffline && (
          <div className="offline-badge">
            📶 Offline
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="expense-form">
        {/* Title */}
        <div className={`form-group ${errors.title ? 'error' : ''}`}>
          <label htmlFor="title">Expense Title *</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Business Lunch"
            className="form-input"
          />
          {errors.title && <div className="error-message">{errors.title}</div>}
        </div>

        {/* Amount and Currency Row */}
        <div className="form-row">
          <div className={`form-group flex-2 ${errors.amount ? 'error' : ''}`}>
            <label htmlFor="amount">Amount *</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              className="form-input"
            />
            {errors.amount && <div className="error-message">{errors.amount}</div>}
          </div>
          
          <div className="form-group flex-1">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="form-select"
            >
              {currencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category and Date Row */}
        <div className="form-row">
          <div className={`form-group flex-1 ${errors.category ? 'error' : ''}`}>
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="form-select"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <div className="error-message">{errors.category}</div>}
          </div>
          
          <div className={`form-group flex-1 ${errors.date ? 'error' : ''}`}>
            <label htmlFor="date">Date *</label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="form-input"
            />
            {errors.date && <div className="error-message">{errors.date}</div>}
          </div>
        </div>

        {/* Merchant */}
        <div className="form-group">
          <label htmlFor="merchant">Merchant</label>
          <input
            id="merchant"
            type="text"
            value={formData.merchant}
            onChange={(e) => handleInputChange('merchant', e.target.value)}
            placeholder="e.g., Restaurant ABC"
            className="form-input"
          />
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="e.g., New York, NY"
            className="form-input"
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Additional details about this expense..."
            className="form-textarea"
            rows="3"
          />
        </div>

        {/* Receipt Upload */}
        <div className={`form-group ${errors.receipt ? 'error' : ''}`}>
          <label>Receipt</label>
          
          <div className="receipt-upload-section">
            {formData.receiptPreview ? (
              <div className="receipt-preview">
                <img src={formData.receiptPreview} alt="Receipt preview" />
                <button
                  type="button"
                  className="remove-receipt"
                  onClick={() => handleInputChange('receiptFile', null)}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="receipt-upload-options">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="file-input"
                  id="receipt-file"
                />
                
                <div className="upload-buttons">
                  <label htmlFor="receipt-file" className="upload-btn">
                    📁 Choose File
                  </label>
                  
                  <button
                    type="button"
                    className="camera-btn"
                    onClick={handleCameraCapture}
                  >
                    📷 Take Photo
                  </button>
                </div>
              </div>
            )}
          </div>

          {imageProcessing && (
            <div className="processing-indicator">
              🔄 Processing image...
            </div>
          )}
          
          {errors.receipt && <div className="error-message">{errors.receipt}</div>}
        </div>

        {/* Tags */}
        <div className="form-group">
          <label>Tags</label>
          <div className="tags-section">
            <div className="tags-list">
              {formData.tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            
            <div className="quick-tags">
              {['Business', 'Client', 'Travel', 'Urgent'].map(quickTag => (
                <button
                  key={quickTag}
                  type="button"
                  className="quick-tag"
                  onClick={() => addTag(quickTag)}
                  disabled={formData.tags.includes(quickTag)}
                >
                  + {quickTag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="form-error-banner">
            {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || imageProcessing}
          >
            {isSubmitting ? (
              <>🔄 {expense ? 'Updating...' : 'Submitting...'}</>
            ) : (
              <>{expense ? 'Update Expense' : 'Submit Expense'}</>
            )}
          </button>
        </div>

        {/* Save Draft Button */}
        {!expense && (
          <button
            type="button"
            className="save-draft-btn"
            onClick={() => {
              // Save as draft logic
              const draftData = { ...formData, status: 'draft' };
              offlineStorage.setData(`expense_draft_${Date.now()}`, draftData);
            }}
            disabled={isSubmitting}
          >
            💾 Save as Draft
          </button>
        )}
      </form>

      {/* Offline Notice */}
      {isOffline && (
        <div className="offline-notice">
          <span className="offline-icon">📶</span>
          <span>You're offline. This expense will be saved locally and synced when you reconnect.</span>
        </div>
      )}
    </div>
  );
};

export default MobileExpenseForm;