import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';

@ApiTags('governance')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get('proposals')
  @ApiOperation({ summary: 'Get all governance proposals' })
  @ApiResponse({ status: 200, description: 'List of governance proposals' })
  async getProposals() {
    return this.governanceService.getProposals();
  }

  @Post('proposals/:id/vote')
  @ApiOperation({ summary: 'Vote on a governance proposal' })
  @ApiResponse({ status: 200, description: 'Vote submitted successfully' })
  async voteOnProposal(
    @Param('id') proposalId: string,
    @Body() voteData: { voter: string; support: boolean; reason?: string }
  ) {
    return this.governanceService.voteOnProposal(proposalId, voteData);
  }

  @Post('proposals/:id/process-results')
  @ApiOperation({ summary: 'Process voting results for a proposal' })
  @ApiResponse({ status: 200, description: 'Voting results processed' })
  async processVotingResults(@Param('id') proposalId: string) {
    return this.governanceService.processVotingResults(proposalId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Governance service health check' })
  @ApiResponse({ status: 200, description: 'Governance service status' })
  async healthCheck() {
    return this.governanceService.healthCheck();
  }
} 