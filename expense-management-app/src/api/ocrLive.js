import { publicApiRequest } from './index';

// Individual function exports
export const extractReceiptText = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  return publicApiRequest('/ocr/extract-text/', {
    method: 'POST',
    headers: {}, // Remove Content-Type to let browser set multipart boundary
    body: formData,
  });
};

export const extractExpenseData = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  return publicApiRequest('/ocr/extract-expense/', {
    method: 'POST',
    headers: {}, // Remove Content-Type to let browser set multipart boundary
    body: formData,
  });
};

export const getOcrProviders = () => {
  return publicApiRequest('/ocr/providers/');
};

export const getProcessingHistory = () => {
  return publicApiRequest('/ocr/history/');
};

export const processWithProvider = async (file, provider = 'auto') => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('provider', provider);
  
  return publicApiRequest('/ocr/process/', {
    method: 'POST',
    headers: {},
    body: formData,
  });
};

export const validateExtraction = (extractionData) => {
  return publicApiRequest('/ocr/validate/', {
    method: 'POST',
    body: JSON.stringify(extractionData),
  });
};

export const getSupportedFormats = () => {
  return publicApiRequest('/ocr/formats/');
};

export const batchProcess = async (files) => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`images`, file);
  });
  
  return publicApiRequest('/ocr/batch/', {
    method: 'POST',
    headers: {},
    body: formData,
  });
};

// Utility function to preview files
export const previewFile = (file) => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // For PDF, we'd need a PDF viewer - for now just return a placeholder
      resolve('/images/pdf-placeholder.png');
    } else {
      resolve('/images/file-placeholder.png');
    }
  });
};

// API object for backward compatibility
export const ocrAPI = {
  extractText: extractReceiptText,
  extractExpenseData,
  getProviders: getOcrProviders,
  getProcessingHistory,
  processWithProvider,
  validateExtraction,
  getSupportedFormats,
  batchProcess,
};

export default ocrAPI;