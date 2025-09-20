import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  async getDashboardAnalytics() {
    return this.analyticsService.getDashboardAnalytics();
  }

  @Get('claims-stats')
  @ApiOperation({ summary: 'Get claims statistics' })
  async getClaimsStats(@Query('period') period?: string) {
    return this.analyticsService.getClaimsStats(period);
  }

  @Get('policies-stats')
  @ApiOperation({ summary: 'Get policies statistics' })
  async getPoliciesStats(@Query('period') period?: string) {
    return this.analyticsService.getPoliciesStats(period);
  }

  @Get('financial-overview')
  @ApiOperation({ summary: 'Get financial overview' })
  async getFinancialOverview() {
    return this.analyticsService.getFinancialOverview();
  }

  @Get('ai-insights')
  @ApiOperation({ summary: 'Get AI service insights' })
  async getAIInsights() {
    return this.analyticsService.getAIInsights();
  }

  @Get('blockchain-metrics')
  @ApiOperation({ summary: 'Get blockchain metrics' })
  async getBlockchainMetrics() {
    return this.analyticsService.getBlockchainMetrics();
  }
} 