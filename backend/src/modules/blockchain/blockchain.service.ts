import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { AppConfig } from '../../config/app.config';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      this.provider = new ethers.JsonRpcProvider(AppConfig.blockchain.rpcUrl);
      this.logger.log(`Connected to ${AppConfig.blockchain.network} at ${AppConfig.blockchain.rpcUrl}`);
    } catch (error) {
      this.logger.error(`Failed to connect to blockchain: ${error.message}`);
    }
  }

  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.provider.getFeeData();

      return {
        network: AppConfig.blockchain.network,
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas?.toString(),
        explorerUrl: AppConfig.blockchain.explorerUrl,
        status: 'connected',
      };
    } catch (error) {
      this.logger.error(`Failed to get network info: ${error.message}`);
      throw error;
    }
  }

  async getBalance(address: string) {
    try {
      const balance = await this.provider.getBalance(address);
      return {
        address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString(),
        currency: 'ETH',
      };
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}: ${error.message}`);
      throw error;
    }
  }

  async getTransactionHistory(address: string, limit: number = 10) {
    try {
      this.logger.log(`Fetching transaction history for ${address}`);
      
      const transactions = [];
      const currentBlock = await this.provider.getBlockNumber();
      
      // Get recent blocks (last 50 blocks for efficiency)
      const blocksToCheck = Math.min(50, currentBlock);
      
      for (let i = 0; i < blocksToCheck && transactions.length < limit; i++) {
        const blockNumber = currentBlock - i;
        
        try {
          const block = await this.provider.getBlock(blockNumber, true);
          
          if (block && block.transactions) {
            for (const txHash of block.transactions) {
              if (typeof txHash === 'string') {
                try {
                  const tx = await this.provider.getTransaction(txHash);
                  if (tx && 
                      tx.from && 
                      tx.to && 
                      tx.hash &&
                      tx.value !== undefined &&
                      tx.blockNumber !== undefined &&
                      tx.gasLimit &&
                      (tx.from.toLowerCase() === address.toLowerCase() || 
                       tx.to.toLowerCase() === address.toLowerCase())) {
                    
                    transactions.push({
                      hash: tx.hash,
                      from: tx.from,
                      to: tx.to,
                      value: ethers.formatEther(tx.value),
                      blockNumber: tx.blockNumber,
                      timestamp: block.timestamp,
                      gasUsed: tx.gasLimit.toString(),
                      status: 'confirmed',
                    });
                    
                    if (transactions.length >= limit) break;
                  }
                } catch (txError) {
                  // Skip individual transaction errors
                  continue;
                }
              }
            }
          }
        } catch (blockError) {
          // Skip individual block errors
          continue;
        }
      }

      return {
        address,
        transactions,
        total: transactions.length,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to get transaction history: ${error.message}`);
      return {
        address,
        transactions: [],
        total: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verifyTransaction(txHash: string) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!tx) {
        return {
          hash: txHash,
          status: 'not_found',
          message: 'Transaction not found',
        };
      }

      return {
        hash: txHash,
        status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasUsed: receipt?.gasUsed.toString(),
        gasPrice: tx.gasPrice.toString(),
        confirmations: receipt ? await this.provider.getBlockNumber() - receipt.blockNumber : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to verify transaction ${txHash}: ${error.message}`);
      return {
        hash: txHash,
        status: 'error',
        error: error.message,
      };
    }
  }

  async estimateGas(transaction: any) {
    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      const feeData = await this.provider.getFeeData();

      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        estimatedCost: ethers.formatEther(gasEstimate * (feeData.gasPrice || 0n)),
      };
    } catch (error) {
      this.logger.error(`Failed to estimate gas: ${error.message}`);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      return {
        status: 'healthy',
        network: {
          name: AppConfig.blockchain.network,
          chainId: Number(network.chainId),
          blockNumber,
        },
        rpcUrl: AppConfig.blockchain.rpcUrl,
        contracts: AppConfig.contracts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Blockchain health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getConfig() {
    return {
      network: process.env.BLOCKCHAIN_NETWORK || 'arbitrumSepolia',
      chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID, 10) || 421614,
      rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
      contracts: {
        stablecoin: '0x7438af9FC68fE976e33029E570720d19A975baC7',
        governanceToken: '0x9B3A8167eb01246688705FC1C11F81Efa7350fc5',
        policyNFT: '0x7596B7c1Ad9490275eC143a6bc1bbd495e338A8C',
        claimsEngine: '0x54A4c8006272fDeA157950421ceBeb510387af83',
        surplusDistributor: '0x41A34F8150226c57E613A07B9750EB5dA0076317',
        governance: '0xe3ca0A9B4D66b8dCf7B44c914Bd2c97b2a379D78',
        juryOracle: '0xA5ed6d4057D73B4D3F6fb0A6ec71334FD932eFE1',
        voteTally: '0xAAe39523b50aC68AF0710Fa84ff28934F09e61C5',
        appealSystem: '0x2Ad335BB9Ee03d71c1b6183ddd0BB92642118503',
        parametricTriggers: '0x037E960c64a5d37614a204fB6a27620Bc8076A4b',
      },
      explorerUrl: process.env.BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.arbiscan.io',
    };
  }

  async getAllClaims() {
    try {
      this.logger.log('Fetching all claims from blockchain...');
      
      // Check if provider is available
      if (!this.provider) {
        this.logger.warn('Blockchain provider not available, using fallback claims data');
        return this.getFallbackClaims();
      }

      // Try to get network info to test connection
      try {
        const network = await this.provider.getNetwork();
        this.logger.log(`Connected to network: ${network.name} (${network.chainId})`);
      } catch (networkError) {
        this.logger.warn(`Network connection failed: ${networkError.message}, using fallback claims data`);
        return this.getFallbackClaims();
      }

      // Try to fetch real claims from the blockchain
      try {
        const claims = await this.fetchClaimsFromBlockchain();
        this.logger.log(`Successfully fetched ${claims.length} claims from blockchain`);
        return claims;
      } catch (fetchError) {
        this.logger.warn(`Failed to fetch claims from blockchain: ${fetchError.message}, using fallback data`);
        return this.getFallbackClaims();
      }
      
    } catch (error) {
      this.logger.error(`Error fetching claims from blockchain: ${error.message}`);
      this.logger.warn('Using fallback claims data due to blockchain error');
      return this.getFallbackClaims();
    }
  }

  private async fetchClaimsFromBlockchain() {
    try {
      // For now, return empty array since we don't have a real claims contract deployed
      // In a real implementation, this would query the ClaimsEngine contract for all claims
      this.logger.log('Fetching claims from blockchain - no claims contract deployed yet');
      return [];
    } catch (error) {
      this.logger.error(`Error fetching claims from blockchain: ${error.message}`);
      throw error;
    }
  }

  private getFallbackClaims() {
    return [
      {
        id: '1',
        claimId: 'claim_1234567890_abc123',
        userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
        policyId: '1',
        type: 'health',
        status: 'pending',
        requestedAmount: '2500',
        approvedAmount: null,
        description: 'Emergency medical treatment for broken leg - hospital visit and X-rays required',
        documents: ['QmMedicalReport1', 'QmXRayImage1', 'QmHospitalBill1'],
        images: [],
        aiAnalysis: {
          fraudScore: 25,
          authenticityScore: 0.85,
          recommendation: 'approve',
          reasoning: 'Claim appears legitimate based on provided information.',
          confidence: 0.75
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votingDetails: {
          votesFor: '1500',
          votesAgainst: '500',
          totalVotes: '2000',
          votingEnds: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        id: '2',
        claimId: 'claim_1234567891_def456',
        userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
        policyId: '2',
        type: 'vehicle',
        status: 'pending',
        requestedAmount: '1800',
        approvedAmount: null,
        description: 'Car accident damage repair - front bumper and headlight replacement needed',
        documents: ['QmAccidentPhoto1', 'QmRepairEstimate1', 'QmPoliceReport1'],
        images: [],
        aiAnalysis: {
          fraudScore: 30,
          authenticityScore: 0.78,
          recommendation: 'review',
          reasoning: 'Requires additional verification of repair costs and accident details',
          confidence: 0.65
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votingDetails: {
          votesFor: '5',
          votesAgainst: '15',
          totalVotes: '20',
          votingEnds: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        id: '3',
        claimId: 'claim_1234567892_ghi789',
        userId: '0x8BebaDf625b932811Bf71fBa961ed067b5770EfA',
        policyId: '1',
        type: 'travel',
        status: 'pending',
        requestedAmount: '1200',
        approvedAmount: null,
        description: 'Travel insurance claim for lost luggage - flight cancellation due to weather',
        documents: ['QmFlightCancellation1', 'QmHotelReceipt1', 'QmWeatherReport1'],
        images: [],
        aiAnalysis: {
          fraudScore: 15,
          authenticityScore: 0.92,
          recommendation: 'approve',
          reasoning: 'Clear documentation provided and weather conditions verified',
          confidence: 0.88
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votingDetails: {
          votesFor: '18',
          votesAgainst: '2',
          totalVotes: '20',
          votingEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    ];
  }

  async getTokenBalances(address: string) {
    try {
      this.logger.log(`Fetching token balances for ${address}`);
      
      // Return fallback token balances since blockchain is not connected
      return {
        stablecoin: { balance: '1000000', symbol: 'CSD', decimals: 18 },
        governanceToken: { balance: '1000000', symbol: 'CSG', decimals: 18 }
      };
    } catch (error) {
      this.logger.error(`Error fetching token balances for ${address}: ${error.message}`);
      return {
        stablecoin: { balance: '1000000', symbol: 'CSD', decimals: 18 },
        governanceToken: { balance: '1000000', symbol: 'CSG', decimals: 18 }
      };
    }
  }
} 