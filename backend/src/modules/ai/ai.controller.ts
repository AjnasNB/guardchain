import { Controller, Post, Body, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { AIService } from './ai.service';

@ApiTags('AI Service')
@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('analyze-claim')
  @ApiOperation({ summary: 'Analyze claim with AI' })
  @ApiResponse({ status: 200, description: 'Claim analysis completed' })
  async analyzeClaim(@Body() claimData: any) {
    return this.aiService.analyzeClaim(claimData);
  }

  @Post('process-document')
  @ApiOperation({ summary: 'Process document with OCR' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async processDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('document_type') documentType: string = 'general'
  ) {
    return this.aiService.processDocument(file, documentType);
  }

  @Post('analyze-image')
  @ApiOperation({ summary: 'Analyze image evidence' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('analysis_type') analysisType: string = 'general'
  ) {
    return this.aiService.analyzeImage(file, analysisType);
  }

  @Post('gemini-analyze')
  @ApiOperation({ summary: 'Advanced claim analysis with Gemini' })
  async geminiAnalyze(@Body() data: { document_text: string; claim_type: string }) {
    return this.aiService.geminiAnalyzeClaim(data.document_text, data.claim_type);
  }

  @Post('gemini-image-analysis')
  @ApiOperation({ summary: 'Advanced image analysis with Gemini' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async geminiImageAnalysis(
    @UploadedFile() file: Express.Multer.File,
    @Body('claim_context') claimContext: string = ''
  ) {
    return this.aiService.geminiAnalyzeImage(file, claimContext);
  }

  @Post('health-check')
  @ApiOperation({ summary: 'Check AI service health' })
  async healthCheck() {
    return this.aiService.healthCheck();
  }
} 