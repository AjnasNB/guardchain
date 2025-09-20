import { registerAs } from '@nestjs/config';

export const aiConfig = registerAs('ai', () => ({
  // AI Service endpoint
  endpoint: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  
  // API key for AI service authentication
  apiKey: process.env.AI_SERVICE_API_KEY || 'guardchain_dev_key_2024',
  
  // Request timeout settings
  timeout: parseInt(process.env.AI_SERVICE_TIMEOUT, 10) || 30000, // 30 seconds
  
  // Retry configuration
  maxRetries: parseInt(process.env.AI_SERVICE_MAX_RETRIES, 10) || 3,
  retryDelay: parseInt(process.env.AI_SERVICE_RETRY_DELAY, 10) || 1000, // 1 second
  
  // Analysis thresholds
  fraudThreshold: parseInt(process.env.AI_FRAUD_THRESHOLD, 10) || 80,
  confidenceThreshold: parseInt(process.env.AI_CONFIDENCE_THRESHOLD, 10) || 70,
  
  // Feature flags
  enableFraudDetection: process.env.AI_ENABLE_FRAUD_DETECTION !== 'false',
  enableDocumentAnalysis: process.env.AI_ENABLE_DOCUMENT_ANALYSIS !== 'false',
  enableImageAnalysis: process.env.AI_ENABLE_IMAGE_ANALYSIS !== 'false',
  
  // File upload limits
  maxFileSize: parseInt(process.env.AI_MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 50MB
  allowedFileTypes: (process.env.AI_ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,bmp,tiff').split(','),
  
  // Processing options
  ocrEngine: process.env.AI_OCR_ENGINE || 'easyocr', // 'tesseract' or 'easyocr'
  imageQuality: process.env.AI_IMAGE_QUALITY || 'high',
  
  // Cache settings
  cacheResults: process.env.AI_CACHE_RESULTS !== 'false',
  cacheExpiry: parseInt(process.env.AI_CACHE_EXPIRY, 10) || 3600, // 1 hour
})); 