import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';

@ApiTags('Claims')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all claims' })
  async findAll(@Query('status') status?: string) {
    return this.claimsService.findAll(status);
  }

  @Get('voting')
  @ApiOperation({ summary: 'Get claims ready for community voting' })
  async getClaimsForVoting() {
    return this.claimsService.getClaimsForVoting();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get claim by ID' })
  async findOne(@Param('id') id: string) {
    return this.claimsService.findOne(id);
  }

  @Get(':id/voting-details')
  @ApiOperation({ summary: 'Get claim with voting details' })
  async getClaimWithVotingDetails(@Param('id') id: string) {
    return this.claimsService.getClaimWithVotingDetails(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new claim' })
  async create(@Body() claimData: any) {
    return this.claimsService.create(claimData);
  }

  @Post('vote')
  @ApiOperation({ summary: 'Vote on a claim' })
  async voteOnClaim(@Body() voteData: any) {
    return this.claimsService.voteOnClaim(voteData);
  }
} 