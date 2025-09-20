import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';

@ApiTags('Policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get('types')
  @ApiOperation({ summary: 'Get available policy types' })
  async getTypes() {
    return {
      types: [
        { 
          id: 'health', 
          name: 'Health Insurance', 
          basePremium: 150, 
          description: 'Comprehensive health coverage for medical expenses',
          minCoverage: 1000,
          maxCoverage: 100000,
          premiumRate: 0.03,
          duration: 365
        },
        { 
          id: 'vehicle', 
          name: 'Vehicle Insurance', 
          basePremium: 200, 
          description: 'Auto insurance coverage for accidents and damage',
          minCoverage: 5000,
          maxCoverage: 500000,
          premiumRate: 0.025,
          duration: 365
        },
        { 
          id: 'travel', 
          name: 'Travel Insurance', 
          basePremium: 50, 
          description: 'Travel protection for trips and vacations',
          minCoverage: 500,
          maxCoverage: 50000,
          premiumRate: 0.04,
          duration: 30
        },
        { 
          id: 'pet', 
          name: 'Pet Insurance', 
          basePremium: 75, 
          description: 'Pet health coverage for veterinary expenses',
          minCoverage: 1000,
          maxCoverage: 25000,
          premiumRate: 0.035,
          duration: 365
        },
        { 
          id: 'home', 
          name: 'Home Insurance', 
          basePremium: 300, 
          description: 'Home and property protection',
          minCoverage: 10000,
          maxCoverage: 1000000,
          premiumRate: 0.02,
          duration: 365
        },
        { 
          id: 'life', 
          name: 'Life Insurance', 
          basePremium: 100, 
          description: 'Life insurance coverage',
          minCoverage: 10000,
          maxCoverage: 1000000,
          premiumRate: 0.015,
          duration: 365
        },
      ],
    };
  }

  @Get('types/available')
  @ApiOperation({ summary: 'Get available policy types' })
  async getAvailableTypes() {
    return this.policiesService.getAvailableTypes();
  }

  @Get()
  @ApiOperation({ summary: 'Get all policies' })
  async findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.policiesService.findAll({ page, limit });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get policies for specific user' })
  async findUserPolicies(@Param('userId') userId: string) {
    return this.policiesService.findUserPolicies(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy by ID' })
  async findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new policy' })
  async create(@Body() policyData: any) {
    return this.policiesService.create(policyData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update policy' })
  async update(@Param('id') id: string, @Body() policyData: any) {
    return this.policiesService.update(id, policyData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete policy' })
  async remove(@Param('id') id: string) {
    return this.policiesService.remove(id);
  }

  @Post('quote')
  @ApiOperation({ summary: 'Get policy quote' })
  async getQuote(@Body() quoteData: any) {
    return this.policiesService.getQuote(quoteData);
  }
} 