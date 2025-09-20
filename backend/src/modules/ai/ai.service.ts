import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../../config/app.config';
import FormData from 'form-data';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly aiServiceUrl = AppConfig.aiService.url;
  private readonly apiKey = AppConfig.aiService.apiKey;

  constructor(private readonly httpService: HttpService) {}

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async analyzeClaim(claimData: any) {
    try {
      this.logger.log(`Analyzing claim ${claimData.claimId} with AI service`);
      
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/analyze-claim`,
          claimData,
          { 
            headers: this.getHeaders(),
            timeout: AppConfig.aiService.timeout 
          }
        )
      );

      this.logger.log(`Claim analysis completed for ${claimData.claimId}`);
      return response.data;

    } catch (error) {
      this.logger.error(`AI claim analysis failed: ${error.message}`);
      throw new HttpException(
        `AI service error: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  async processDocument(file: Express.Multer.File, documentType: string) {
    try {
      this.logger.log(`Processing document ${file.originalname} with AI service`);

      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      formData.append('document_type', documentType);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/process-document`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              ...formData.getHeaders(),
            },
            timeout: AppConfig.aiService.timeout,
            maxContentLength: AppConfig.aiService.maxFileSize,
            maxBodyLength: AppConfig.aiService.maxFileSize,
          }
        )
      );

      this.logger.log(`Document processing completed for ${file.originalname}`);
      return response.data;

    } catch (error) {
      this.logger.error(`AI document processing failed: ${error.message}`);
      throw new HttpException(
        `AI service error: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  async analyzeImage(file: Express.Multer.File, analysisType: string) {
    try {
      this.logger.log(`Analyzing image ${file.originalname} with AI service`);

      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      formData.append('analysis_type', analysisType);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/analyze-image`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              ...formData.getHeaders(),
            },
            timeout: AppConfig.aiService.timeout,
            maxContentLength: AppConfig.aiService.maxFileSize,
            maxBodyLength: AppConfig.aiService.maxFileSize,
          }
        )
      );

      this.logger.log(`Image analysis completed for ${file.originalname}`);
      return response.data;

    } catch (error) {
      this.logger.error(`AI image analysis failed: ${error.message}`);
      throw new HttpException(
        `AI service error: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  async geminiAnalyzeClaim(documentText: string, claimType: string) {
    try {
      this.logger.log(`Running Gemini analysis for ${claimType} claim`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/gemini-analyze`,
          {
            document_text: documentText,
            claim_type: claimType,
          },
          { 
            headers: this.getHeaders(),
            timeout: AppConfig.aiService.timeout 
          }
        )
      );

      this.logger.log(`Gemini analysis completed for ${claimType} claim`);
      return response.data;

    } catch (error) {
      this.logger.error(`Gemini analysis failed: ${error.message}`);
      throw new HttpException(
        `Gemini service error: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  async geminiAnalyzeImage(file: Express.Multer.File, claimContext: string) {
    try {
      this.logger.log(`Running Gemini image analysis for ${file.originalname}`);

      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      formData.append('claim_context', claimContext);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/gemini-image-analysis`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              ...formData.getHeaders(),
            },
            timeout: AppConfig.aiService.timeout,
            maxContentLength: AppConfig.aiService.maxFileSize,
            maxBodyLength: AppConfig.aiService.maxFileSize,
          }
        )
      );

      this.logger.log(`Gemini image analysis completed for ${file.originalname}`);
      return response.data;

    } catch (error) {
      this.logger.error(`Gemini image analysis failed: ${error.message}`);
      throw new HttpException(
        `Gemini service error: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  async healthCheck() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.aiServiceUrl}/health`,
          { 
            headers: this.getHeaders(),
            timeout: 5000 // Short timeout for health check
          }
        )
      );

      return {
        status: 'healthy',
        aiService: response.data,
        connection: 'ok',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`AI service health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
        connection: 'failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async batchProcessDocuments(files: Express.Multer.File[], documentTypes: string[]) {
    try {
      this.logger.log(`Batch processing ${files.length} documents`);

      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      });

      if (documentTypes && documentTypes.length > 0) {
        documentTypes.forEach(type => {
          formData.append('document_types', type);
        });
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/batch-process`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              ...formData.getHeaders(),
            },
            timeout: AppConfig.aiService.timeout * 2, // Double timeout for batch processing
            maxContentLength: AppConfig.aiService.maxFileSize * files.length,
            maxBodyLength: AppConfig.aiService.maxFileSize * files.length,
          }
        )
      );

      this.logger.log(`Batch processing completed for ${files.length} documents`);
      return response.data;

    } catch (error) {
      this.logger.error(`AI batch processing failed: ${error.message}`);
      throw new HttpException(
        `AI service error: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }
} 