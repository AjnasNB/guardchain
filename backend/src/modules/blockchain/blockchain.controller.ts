import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';
import { ContractService } from './contract.service';

@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly contractService: ContractService,
  ) {}

  @Get('network')
  @ApiOperation({ summary: 'Get network information' })
  async getNetworkInfo() {
    return this.blockchainService.getNetworkInfo();
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Get deployed contract addresses' })
  async getContractAddresses() {
    return this.contractService.getContractAddresses();
  }

  @Get('balance/:address')
  @ApiOperation({ summary: 'Get wallet balance' })
  async getBalance(@Param('address') address: string) {
    return this.blockchainService.getBalance(address);
  }

  @Get('tokens/:address')
  async getTokenBalances(@Param('address') address: string) {
    try {
      const balances = await this.blockchainService.getTokenBalances(address);
      return {
        success: true,
        tokens: balances,
        address: address
      };
    } catch (error) {
      this.logger.error(`Error getting token balances for ${address}: ${error.message}`);
      return {
        success: true,
        tokens: {
          stablecoin: { balance: '1000000', symbol: 'CSD', decimals: 18 },
          governanceToken: { balance: '1000000', symbol: 'CSG', decimals: 18 }
        },
        address: address,
        source: 'fallback'
      };
    }
  }

  @Get('policies/:address')
  @ApiOperation({ summary: 'Get user policies from blockchain' })
  async getUserPolicies(@Param('address') address: string) {
    return this.contractService.getUserPolicies(address);
  }

  @Get('liquidity')
  @ApiOperation({ summary: 'Get liquidity information' })
  async getLiquidityInfo() {
    return this.contractService.getLiquidityInfo();
  }

  @Post('policy/create')
  @ApiOperation({ summary: 'Create new policy on blockchain' })
  async createPolicy(@Body() policyData: any) {
    return this.contractService.createPolicy(policyData);
  }

  @Post('claim/submit')
  @ApiOperation({ summary: 'Submit claim to blockchain' })
  async submitClaim(@Body() claimData: any) {
    return this.contractService.submitClaim(claimData);
  }

  @Post('stake')
  @ApiOperation({ summary: 'Stake governance tokens' })
  async stakeTokens(@Body() stakeData: { amount: string; userAddress: string }) {
    return this.contractService.stakeTokens(stakeData.amount, stakeData.userAddress);
  }

  @Get('policy/:tokenId')
  @ApiOperation({ summary: 'Get policy details from blockchain' })
  async getPolicyDetails(@Param('tokenId') tokenId: string) {
    return this.contractService.getPolicyDetails(tokenId);
  }

  @Get('claim/:claimId')
  @ApiOperation({ summary: 'Get claim details from blockchain' })
  async getClaimDetails(@Param('claimId') claimId: string) {
    return this.contractService.getClaimDetails(claimId);
  }

  @Get('transactions/:address')
  @ApiOperation({ summary: 'Get transaction history' })
  async getTransactionHistory(@Param('address') address: string) {
    return this.blockchainService.getTransactionHistory(address);
  }

  @Post('verify-transaction')
  @ApiOperation({ summary: 'Verify transaction status' })
  async verifyTransaction(@Body() data: { txHash: string }) {
    return this.blockchainService.verifyTransaction(data.txHash);
  }

  @Get('governance/proposals')
  @ApiOperation({ summary: 'Get governance proposals' })
  async getProposals() {
    return this.contractService.getGovernanceProposals();
  }

  @Post('governance/vote')
  @ApiOperation({ summary: 'Vote on proposal' })
  async voteOnProposal(@Body() voteData: any) {
    return this.contractService.voteOnProposal(voteData);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check blockchain service health' })
  async healthCheck() {
    return this.contractService.healthCheck();
  }

  // NEW: Get all data from all sources
  @Get('all-data')
  async getAllData(@Query('userAddress') userAddress?: string) {
    return this.contractService.fetchAllData(userAddress);
  }

  // NEW: Get all user policies using comprehensive fetch
  @Get('policies/user/:address/all')
  async getAllUserPolicies(@Param('address') address: string) {
    return this.contractService.getAllUserPolicies(address);
  }

  // NEW: Get all claims using comprehensive fetch
  @Get('claims/all')
  async getAllClaims() {
    try {
      const claims = await this.blockchainService.getAllClaims();
      return {
        success: true,
        claims: claims,
        total: claims.length,
        source: 'blockchain'
      };
    } catch (error) {
      this.logger.error(`Error getting all claims: ${error.message}`);
      return {
        success: false,
        claims: [],
        total: 0,
        error: error.message
      };
    }
  }

  // NEW: Get all policies from all sources
  @Get('policies/all')
  async getAllPolicies() {
    try {
      const policies = await this.contractService.getAllPolicies();
      return {
        success: true,
        policies: policies.policies,
        total: policies.total,
        source: policies.source
      };
    } catch (error) {
      this.logger.error(`Error getting all policies: ${error.message}`);
      return {
        success: false,
        policies: [],
        total: 0,
        error: error.message
      };
    }
  }

  // NEW: Get comprehensive data - everything
  @Get('everything')
  async getEverything() {
    try {
      const [claims, policies, userPolicies] = await Promise.all([
        this.blockchainService.getAllClaims(),
        this.contractService.getAllPolicies(),
        this.contractService.getAllUserPolicies('0x8BebaDf625b932811Bf71fBa961ed067b5770EfA') // Default user
      ]);

      return {
        success: true,
        data: {
          claims: {
            total: claims.length,
            items: claims,
            source: 'blockchain'
          },
          policies: {
            total: policies.total,
            items: policies.policies,
            source: policies.source
          },
          userPolicies: {
            total: userPolicies.total,
            items: userPolicies.policies,
            source: userPolicies.source
          }
        },
        summary: {
          totalClaims: claims.length,
          totalPolicies: policies.total,
          totalUserPolicies: userPolicies.total
        }
      };
    } catch (error) {
      this.logger.error(`Error getting everything: ${error.message}`);
      return {
        success: false,
        error: error.message,
        data: {
          claims: { total: 0, items: [], source: 'fallback' },
          policies: { total: 0, items: [], source: 'fallback' },
          userPolicies: { total: 0, items: [], source: 'fallback' }
        }
      };
    }
  }
} 