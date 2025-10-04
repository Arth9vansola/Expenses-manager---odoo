// Image Upload and Optimization Utilities
// Handles receipt image processing, compression, and optimization

class ImageUploadManager {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxCompressedSize = 2 * 1024 * 1024; // 2MB
    this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.compressionQuality = 0.8;
    this.maxWidth = 1920;
    this.maxHeight = 1080;
  }

  // Validate file before processing
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file selected');
      return { valid: false, errors };
    }

    if (!this.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Please use JPG, PNG, or WebP.`);
    }

    if (file.size > this.maxFileSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`);
    }

    return {
      valid: errors.length === 0,
      errors,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    };
  }

  // Process and optimize image
  async processImage(file, options = {}) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const processOptions = {
      quality: options.quality || this.compressionQuality,
      maxWidth: options.maxWidth || this.maxWidth,
      maxHeight: options.maxHeight || this.maxHeight,
      format: options.format || 'jpeg',
      ...options
    };

    try {
      // Create image element
      const img = await this.createImageElement(file);
      
      // Calculate new dimensions
      const { width, height } = this.calculateDimensions(
        img.naturalWidth, 
        img.naturalHeight, 
        processOptions.maxWidth, 
        processOptions.maxHeight
      );

      // Create canvas and compress
      const canvas = this.createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Draw image with potential enhancements
      if (options.enhance) {
        this.enhanceImage(ctx, img, width, height);
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Convert to blob
      const blob = await this.canvasToBlob(canvas, processOptions.format, processOptions.quality);

      // Generate metadata
      const metadata = this.generateMetadata(file, blob, { width, height });

      return {
        originalFile: file,
        processedBlob: blob,
        metadata,
        dataUrl: await this.blobToDataUrl(blob),
        canvas // For preview purposes
      };

    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  // Create image element from file
  createImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Calculate optimal dimensions maintaining aspect ratio
  calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Scale down if image is larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;
      
      if (width > height) {
        width = maxWidth;
        height = width / aspectRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
      } else {
        height = maxHeight;
        width = height * aspectRatio;
        
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
      }
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  // Create canvas element
  createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // Enhanced image processing (brightness, contrast, sharpness)
  enhanceImage(ctx, img, width, height) {
    // Draw original image
    ctx.drawImage(img, 0, 0, width, height);

    // Apply enhancements
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Enhance brightness and contrast for better OCR
    const brightness = 10; // Slight brightness increase
    const contrast = 1.1;  // Slight contrast increase

    for (let i = 0; i < data.length; i += 4) {
      // Red, Green, Blue channels
      for (let j = 0; j < 3; j++) {
        let value = data[i + j];
        
        // Apply brightness
        value += brightness;
        
        // Apply contrast
        value = (value - 128) * contrast + 128;
        
        // Clamp values
        data[i + j] = Math.max(0, Math.min(255, value));
      }
      // Alpha channel remains unchanged
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // Convert canvas to blob
  canvasToBlob(canvas, format = 'jpeg', quality = 0.8) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // Convert blob to data URL
  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  // Generate comprehensive metadata
  generateMetadata(originalFile, processedBlob, dimensions) {
    const compressionRatio = ((originalFile.size - processedBlob.size) / originalFile.size * 100).toFixed(2);
    
    return {
      original: {
        name: originalFile.name,
        size: originalFile.size,
        type: originalFile.type,
        lastModified: originalFile.lastModified
      },
      processed: {
        size: processedBlob.size,
        type: processedBlob.type,
        width: dimensions.width,
        height: dimensions.height
      },
      compression: {
        ratio: `${compressionRatio}%`,
        sizeSaved: originalFile.size - processedBlob.size
      },
      processing: {
        timestamp: Date.now(),
        processingTime: null // Will be set by caller
      }
    };
  }

  // Batch process multiple images
  async processBatch(files, options = {}) {
    const results = [];
    const batchOptions = {
      concurrency: options.concurrency || 3,
      onProgress: options.onProgress || (() => {}),
      ...options
    };

    // Process files in chunks to avoid overwhelming the browser
    const chunks = this.chunkArray(Array.from(files), batchOptions.concurrency);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkPromises = chunk.map(async (file, index) => {
        try {
          const result = await this.processImage(file, options);
          const overallIndex = i * batchOptions.concurrency + index;
          batchOptions.onProgress(overallIndex + 1, files.length, result);
          return { success: true, result, file };
        } catch (error) {
          return { success: false, error: error.message, file };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  // Chunk array into smaller arrays
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Generate thumbnail
  async generateThumbnail(file, size = 150) {
    const result = await this.processImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7
    });
    
    return {
      dataUrl: result.dataUrl,
      blob: result.processedBlob,
      size: result.metadata.processed.size
    };
  }

  // OCR preprocessing
  async preprocessForOCR(file) {
    return await this.processImage(file, {
      quality: 0.9,
      maxWidth: 2048,
      maxHeight: 2048,
      enhance: true,
      format: 'png' // PNG is better for OCR
    });
  }

  // Utility functions
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Estimate processing time
  estimateProcessingTime(file) {
    // Rough estimation based on file size (in seconds)
    const sizeInMB = file.size / (1024 * 1024);
    return Math.max(1, Math.ceil(sizeInMB * 0.5)); // ~0.5 seconds per MB
  }

  // Check browser support for image formats
  checkFormatSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    const support = {
      jpeg: canvas.toDataURL('image/jpeg').indexOf('data:image/jpeg') === 0,
      png: canvas.toDataURL('image/png').indexOf('data:image/png') === 0,
      webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    };
    
    return support;
  }

  // Get EXIF data (basic implementation)
  async getImageInfo(file) {
    try {
      const img = await this.createImageElement(file);
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        megapixels: (img.naturalWidth * img.naturalHeight / 1000000).toFixed(2),
        estimatedQuality: this.estimateImageQuality(file)
      };
    } catch (error) {
      console.error('Failed to get image info:', error);
      return null;
    }
  }

  // Estimate image quality based on file size and dimensions
  estimateImageQuality(file) {
    const bytesPerPixel = file.size / (1920 * 1080); // Assume max resolution
    if (bytesPerPixel > 3) return 'High';
    if (bytesPerPixel > 1.5) return 'Medium';
    return 'Low';
  }

  // Progressive JPEG detection
  async isProgressive(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Look for progressive JPEG markers
      for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 0xFF && bytes[i + 1] === 0xC2) {
          return true; // Progressive JPEG marker found
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking progressive JPEG:', error);
      return false;
    }
  }
}

// Create singleton instance
const imageManager = new ImageUploadManager();

// React hook for image processing
export const useImageUpload = () => {
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [results, setResults] = React.useState([]);
  const [errors, setErrors] = React.useState([]);

  const processImages = async (files, options = {}) => {
    setProcessing(true);
    setProgress(0);
    setResults([]);
    setErrors([]);

    try {
      const batchOptions = {
        ...options,
        onProgress: (completed, total, result) => {
          setProgress((completed / total) * 100);
          if (result) {
            setResults(prev => [...prev, result]);
          }
        }
      };

      const batchResults = await imageManager.processBatch(files, batchOptions);
      
      const successResults = batchResults.filter(r => r.success).map(r => r.result);
      const errorResults = batchResults.filter(r => !r.success);
      
      setResults(successResults);
      setErrors(errorResults);
      
      return successResults;
    } catch (error) {
      setErrors([{ error: error.message }]);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const processImage = async (file, options = {}) => {
    setProcessing(true);
    setErrors([]);
    
    try {
      const result = await imageManager.processImage(file, options);
      setResults([result]);
      return result;
    } catch (error) {
      setErrors([{ error: error.message }]);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    progress,
    results,
    errors,
    processImage,
    processImages,
    validateFile: (file) => imageManager.validateFile(file),
    generateThumbnail: (file, size) => imageManager.generateThumbnail(file, size),
    preprocessForOCR: (file) => imageManager.preprocessForOCR(file)
  };
};

export default imageManager;