// Mock OCR service for receipt processing
export const ocrService = {
  processReceipt: (file) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock OCR results based on file name patterns
        const fileName = file.name.toLowerCase();
        
        let mockResult = {
          amount: null,
          date: null,
          merchant: null,
          suggestedCategory: null,
          suggestedDescription: null,
          confidence: Math.random() * 0.4 + 0.6 // 60-100% confidence
        };

        // Simulate different receipt types
        if (fileName.includes('restaurant') || fileName.includes('lunch') || fileName.includes('dinner')) {
          mockResult = {
            amount: (Math.random() * 200 + 20).toFixed(2),
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            merchant: 'The Gourmet Restaurant',
            suggestedCategory: 'Meals & Entertainment',
            suggestedDescription: 'Business meal at restaurant',
            confidence: 0.92
          };
        } else if (fileName.includes('gas') || fileName.includes('fuel') || fileName.includes('taxi') || fileName.includes('uber')) {
          mockResult = {
            amount: (Math.random() * 100 + 15).toFixed(2),
            date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            merchant: 'City Taxi Service',
            suggestedCategory: 'Travel & Transportation',
            suggestedDescription: 'Transportation expense',
            confidence: 0.88
          };
        } else if (fileName.includes('hotel') || fileName.includes('flight') || fileName.includes('airline')) {
          mockResult = {
            amount: (Math.random() * 500 + 200).toFixed(2),
            date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            merchant: 'Global Airlines',
            suggestedCategory: 'Travel & Transportation',
            suggestedDescription: 'Business travel expense',
            confidence: 0.95
          };
        } else if (fileName.includes('office') || fileName.includes('supplies') || fileName.includes('staples')) {
          mockResult = {
            amount: (Math.random() * 150 + 25).toFixed(2),
            date: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            merchant: 'Office Depot',
            suggestedCategory: 'Office Supplies',
            suggestedDescription: 'Office supplies purchase',
            confidence: 0.85
          };
        } else {
          // Generic receipt
          mockResult = {
            amount: (Math.random() * 300 + 10).toFixed(2),
            date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            merchant: 'Business Vendor',
            suggestedCategory: 'Other',
            suggestedDescription: 'Business expense',
            confidence: 0.75
          };
        }

        resolve({
          success: true,
          data: mockResult
        });
      }, 2000); // Simulate processing time
    });
  },

  validateReceipt: (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload JPG, PNG, GIF, or PDF files only.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Please upload files smaller than 10MB.'
      };
    }

    return { valid: true };
  }
};

export const previewFile = (file) => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    } else {
      resolve(null); // PDF or other file types
    }
  });
};