import React, { useState, useEffect } from 'react';
import { FormInput, FormSelect, LoadingSpinner } from './FormComponents';
import { expenseCategories, currencies } from '../api/expenses';
import { ocrService, previewFile } from '../api/ocr';
import { validateRequired } from '../api/validation';
import './ExpenseForm.css';

const ExpenseForm = ({ 
  onSubmit, 
  onCancel, 
  initialData = null, 
  userCompany,
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    amount: initialData?.amount || '',
    currency: initialData?.currency || userCompany?.currency?.code || 'USD',
    receiptFile: null,
    receiptUrl: initialData?.receiptUrl || null,
    receiptName: initialData?.receiptName || null
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (initialData?.receiptUrl) {
      setReceiptPreview(initialData.receiptUrl);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleFileChange = async (file) => {
    if (!file) return;

    const validation = ocrService.validateReceipt(file);
    if (!validation.valid) {
      setErrors({ receipt: validation.error });
      return;
    }

    setFormData({
      ...formData,
      receiptFile: file,
      receiptName: file.name
    });

    // Generate preview
    const preview = await previewFile(file);
    setReceiptPreview(preview);

    // Clear previous OCR result and errors
    setOcrResult(null);
    setErrors({ ...errors, receipt: '' });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const processOCR = async () => {
    if (!formData.receiptFile) {
      setErrors({ receipt: 'Please upload a receipt first' });
      return;
    }

    setOcrProcessing(true);
    try {
      const result = await ocrService.processReceipt(formData.receiptFile);
      
      if (result.success) {
        setOcrResult(result.data);
        // Don't auto-fill, let user decide which fields to use
      } else {
        setErrors({ ocr: 'Failed to process receipt. Please enter details manually.' });
      }
    } catch (error) {
      setErrors({ ocr: 'OCR processing failed. Please try again.' });
    } finally {
      setOcrProcessing(false);
    }
  };

  const applyOcrField = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });

    // Update category if suggested
    if (field === 'suggestedCategory') {
      const category = expenseCategories.find(c => c.name === value);
      if (category) {
        setFormData(prev => ({
          ...prev,
          categoryId: category.id
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!validateRequired(formData.description)) {
      newErrors.description = 'Description is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!validateRequired(formData.date)) {
      newErrors.date = 'Date is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!validateRequired(formData.currency)) {
      newErrors.currency = 'Currency is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId),
        category: expenseCategories.find(c => c.id === parseInt(formData.categoryId))?.name
      };

      await onSubmit(submitData);
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to save expense' });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = expenseCategories.map(category => ({
    value: category.id,
    label: category.name
  }));

  const currencyOptions = currencies.map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`
  }));

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <div className="form-row">
        <FormInput
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          error={errors.description}
          required
          disabled={loading}
          placeholder="Enter expense description"
          className="form-col-full"
        />
      </div>

      <div className="form-row">
        <FormSelect
          label="Category"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          error={errors.categoryId}
          options={categoryOptions}
          required
          disabled={loading}
          className="form-col-half"
        />

        <FormInput
          label="Date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          error={errors.date}
          required
          disabled={loading}
          className="form-col-half"
        />
      </div>

      <div className="form-row">
        <FormInput
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          error={errors.amount}
          required
          disabled={loading}
          placeholder="0.00"
          className="form-col-half"
        />

        <FormSelect
          label="Currency"
          name="currency"
          value={formData.currency}
          onChange={handleChange}
          error={errors.currency}
          options={currencyOptions}
          required
          disabled={loading}
          className="form-col-half"
        />
      </div>

      {/* Receipt Upload Section */}
      <div className="receipt-section">
        <label className="form-label">
          Receipt Upload <span className="optional">(Optional)</span>
        </label>
        
        <div 
          className={`file-drop-zone ${dragActive ? 'active' : ''} ${receiptPreview ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {receiptPreview ? (
            <div className="receipt-preview">
              {formData.receiptFile?.type?.startsWith('image/') ? (
                <img src={receiptPreview} alt="Receipt preview" />
              ) : (
                <div className="file-preview">
                  <i className="file-icon">📄</i>
                  <span>{formData.receiptName}</span>
                </div>
              )}
              <button
                type="button"
                className="remove-file"
                onClick={() => {
                  setFormData({ ...formData, receiptFile: null, receiptName: null, receiptUrl: null });
                  setReceiptPreview(null);
                  setOcrResult(null);
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="drop-zone-content">
              <i className="upload-icon">📁</i>
              <p>Drag & drop receipt here or click to browse</p>
              <p className="file-types">Supports: JPG, PNG, GIF, PDF (max 10MB)</p>
              <input
                type="file"
                onChange={(e) => handleFileChange(e.target.files[0])}
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                id="receipt-upload"
                disabled={loading}
              />
              <label htmlFor="receipt-upload" className="btn btn-secondary">
                Choose File
              </label>
            </div>
          )}
        </div>

        {errors.receipt && (
          <span className="error-message">{errors.receipt}</span>
        )}

        {/* OCR Processing */}
        {formData.receiptFile && (
          <div className="ocr-section">
            <button
              type="button"
              onClick={processOCR}
              disabled={ocrProcessing || loading}
              className="btn btn-primary ocr-btn"
            >
              {ocrProcessing ? (
                <>
                  <LoadingSpinner size="small" />
                  Processing Receipt...
                </>
              ) : (
                <>
                  🔍 Extract Data with OCR
                </>
              )}
            </button>

            {errors.ocr && (
              <span className="error-message">{errors.ocr}</span>
            )}

            {ocrResult && (
              <div className="ocr-results">
                <h4>Extracted Information (Confidence: {(ocrResult.confidence * 100).toFixed(0)}%)</h4>
                <div className="ocr-fields">
                  {ocrResult.amount && (
                    <div className="ocr-field">
                      <span>Amount: {ocrResult.amount}</span>
                      <button
                        type="button"
                        onClick={() => applyOcrField('amount', ocrResult.amount)}
                        className="apply-btn"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {ocrResult.date && (
                    <div className="ocr-field">
                      <span>Date: {ocrResult.date}</span>
                      <button
                        type="button"
                        onClick={() => applyOcrField('date', ocrResult.date)}
                        className="apply-btn"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {ocrResult.merchant && (
                    <div className="ocr-field">
                      <span>Merchant: {ocrResult.merchant}</span>
                      <button
                        type="button"
                        onClick={() => applyOcrField('description', `${formData.description} - ${ocrResult.merchant}`.trim())}
                        className="apply-btn"
                      >
                        Add to Description
                      </button>
                    </div>
                  )}
                  {ocrResult.suggestedCategory && (
                    <div className="ocr-field">
                      <span>Suggested Category: {ocrResult.suggestedCategory}</span>
                      <button
                        type="button"
                        onClick={() => applyOcrField('suggestedCategory', ocrResult.suggestedCategory)}
                        className="apply-btn"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {ocrResult.suggestedDescription && (
                    <div className="ocr-field">
                      <span>Suggested Description: {ocrResult.suggestedDescription}</span>
                      <button
                        type="button"
                        onClick={() => applyOcrField('description', ocrResult.suggestedDescription)}
                        className="apply-btn"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {errors.submit && (
        <div className="error-banner">
          {errors.submit}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || ocrProcessing}
        >
          {loading ? (
            <>
              <LoadingSpinner size="small" />
              {isEdit ? 'Updating...' : 'Saving...'}
            </>
          ) : (
            isEdit ? 'Update Expense' : 'Save Expense'
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading || ocrProcessing}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;