import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';
import { AppConfig } from '../../config/app.config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private contracts: { [key: string]: ethers.Contract } = {};

  constructor(private readonly blockchainService: BlockchainService) {
    this.initializeContracts();
  }

  private async initializeContracts() {
    try {
      this.logger.log('Initializing blockchain contracts...');
      
      const provider = this.blockchainService.getProvider();
      const config = this.blockchainService.getConfig();
      
      // Use the deployed contract addresses
      const contractAddresses = {
        stablecoin: config.contracts.stablecoin,
        governanceToken: config.contracts.governanceToken,
        policyNFT: config.contracts.policyNFT,
        claimsEngine: config.contracts.claimsEngine,
        surplusDistributor: config.contracts.surplusDistributor,
        governance: config.contracts.governance,
        juryOracle: config.contracts.juryOracle,
        voteTally: config.contracts.voteTally,
        appealSystem: config.contracts.appealSystem,
        parametricTriggers: config.contracts.parametricTriggers,
      };
      
      this.logger.log('Contract addresses:', contractAddresses);
      
      // Initialize contracts with deployed addresses
      if (contractAddresses.stablecoin) {
        this.contracts.stablecoin = new ethers.Contract(
          contractAddresses.stablecoin,
          ['function balanceOf(address) view returns (uint256)', 'function name() view returns (string)', 'function symbol() view returns (string)'],
          provider
        );
      }
      
      if (contractAddresses.governanceToken) {
        this.contracts.governanceToken = new ethers.Contract(
          contractAddresses.governanceToken,
          ['function balanceOf(address) view returns (uint256)', 'function name() view returns (string)', 'function symbol() view returns (string)'],
          provider
        );
      }
      
      if (contractAddresses.policyNFT) {
        this.contracts.policyNFT = new ethers.Contract(
          contractAddresses.policyNFT,
          [
            'function totalSupply() view returns (uint256)',
            'function ownerOf(uint256) view returns (address)',
            'function tokenURI(uint256) view returns (string)',
            'function getPolicyData(uint256) view returns (tuple(uint8,uint8,address,address,uint256,uint256,uint256,uint256,uint256,string,bytes32))',
            'function createPolicy(address,uint8,uint256,address,string,bytes32,uint256) returns (uint256)',
            'function calculatePremium(uint8,uint256) view returns (uint256)',
            'function isPolicyActive(uint256) view returns (bool)',
            'function getRemainingCoverage(uint256) view returns (uint256)'
          ],
          provider
        );
      }
      
      if (contractAddresses.claimsEngine) {
        this.contracts.claimsEngine = new ethers.Contract(
          contractAddresses.claimsEngine,
          [
            'function submitClaim(uint256,uint8,uint256,string,string[]) returns (uint256)',
            'function getClaim(uint256) view returns (tuple(uint256,uint256,address,uint8,uint8,uint8,uint256,uint256,uint256,uint256,string,string[],bytes32,uint256))',
            'function castVote(uint256,bool,uint256,string)',
            'function getJuryVoting(uint256) view returns (address[],uint256,uint256,uint256,uint256,bool)',
            'function processParametricClaim(uint256,bytes,bool)',
            'function submitAIAnalysis(uint256,uint256,bytes32,uint256)'
          ],
          provider
        );
      }
      
      if (contractAddresses.governance) {
        this.contracts.governance = new ethers.Contract(
          contractAddresses.governance,
          [
            'function createProposal(string,string,uint256) returns (uint256)',
            'function vote(uint256,bool,string)',
            'function getProposal(uint256) view returns (tuple(string,string,uint256,uint256,uint256,uint256,bool,bool))',
            'function getProposalCount() view returns (uint256)',
            'function executeProposal(uint256)'
          ],
          provider
        );
      }
      
      if (contractAddresses.surplusDistributor) {
        this.contracts.surplusDistributor = new ethers.Contract(
          contractAddresses.surplusDistributor,
          [
            'function distributeSurplus()',
            'function getTotalSurplus() view returns (uint256)',
            'function getClaimableAmount(address) view returns (uint256)'
          ],
          provider
        );
      }
      
      this.logger.log('All contracts initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize contracts:', error);
      this.initializeFallbackContracts(this.blockchainService.getProvider());
    }
  }

  private initializeFallbackContracts(provider: ethers.JsonRpcProvider) {
    try {
      // Simplified ABIs for basic operations
      const erc20Abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'event Transfer(address indexed from, address indexed to, uint256 value)',
        'event Approval(address indexed owner, address indexed spender, uint256 value)'
      ];

      const erc721Abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function mint(address to, uint256 tokenId, string uri)',
        'function safeMint(address to, uint256 tokenId, string uri)',
        'function transferFrom(address from, address to, uint256 tokenId)',
        'function approve(address to, uint256 tokenId)',
        'function getApproved(uint256 tokenId) view returns (address)',
        'function isApprovedForAll(address owner, address operator) view returns (bool)',
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
        'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
        'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
      ];

      const policyNFTAbi = [
        ...erc721Abi,
        'function createPolicy(address to, uint8 policyType, uint256 coverageAmount, address beneficiary, string coverageTerms, bytes32 ipfsHash, uint256 customTermLength) returns (uint256)',
        'function getPolicyData(uint256 tokenId) view returns (uint8 policyType, uint8 status, address policyholder, address beneficiary, uint256 coverageAmount, uint256 premium, uint256 creationDate, uint256 expiryDate, uint256 claimedAmount, string coverageTerms, bytes32 ipfsHash)',
        'function calculatePremium(uint8 policyType, uint256 coverageAmount) view returns (uint256)',
        'function isPolicyActive(uint256 tokenId) view returns (bool)',
        'function getRemainingCoverage(uint256 tokenId) view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'event PolicyCreated(uint256 indexed tokenId, address indexed policyholder, uint8 policyType, uint256 coverageAmount, uint256 premium, uint256 expiryDate)',
        'event PolicyExpired(uint256 indexed tokenId)',
        'event PolicyCancelled(uint256 indexed tokenId)'
      ];

      const claimsEngineAbi = [
        'function submitClaim(uint256 policyId, uint8 claimType, uint256 requestedAmount, string description, string[] evidenceHashes) returns (uint256)',
        'function getClaim(uint256 claimId) view returns (tuple(uint256,uint256,address,uint8,uint8,uint8,uint256,uint256,uint256,uint256,string,string[],bytes32,uint256))',
        'function processParametricClaim(uint256 claimId, bytes oracleData, bool approved)',
        'function submitAIAnalysis(uint256 claimId, uint256 fraudScore, bytes32 analysisHash, uint256 recommendedAmount)',
        'function castVote(uint256 claimId, bool approved, uint256 suggestedAmount, string justification)',
        'function getJuryVoting(uint256 claimId) view returns (address[] jurors, uint256 votesFor, uint256 votesAgainst, uint256 totalVotes, uint256 averageAmount, bool concluded)',
        'function getClaimCount() view returns (uint256)',
        'event ClaimSubmitted(uint256 indexed claimId, uint256 indexed policyId, address indexed claimant, uint8 claimType, uint256 requestedAmount)',
        'event ClaimApproved(uint256 indexed claimId, uint256 payoutAmount, uint8 processingType)',
        'event ClaimRejected(uint256 indexed claimId, string reason)',
        'event VoteCast(uint256 indexed claimId, address indexed juror, bool approved, uint256 suggestedAmount)'
      ];

      const governanceAbi = [
        'function createProposal(string title, string description, uint256 votingPeriod) returns (uint256)',
        'function vote(uint256 proposalId, bool support, string reason)',
        'function executeProposal(uint256 proposalId)',
        'function getProposalDetails(uint256 proposalId) view returns (string title, string description, uint256 startTime, uint256 endTime, uint256 votesFor, uint256 votesAgainst, bool executed)',
        'function getProposalCount() view returns (uint256)',
        'function hasVoted(uint256 proposalId, address voter) view returns (bool)',
        'function getVotingPower(address voter) view returns (uint256)',
        'event ProposalCreated(uint256 indexed proposalId, string title, string description)',
        'event Voted(uint256 indexed proposalId, address indexed voter, bool support, string reason)',
        'event ProposalExecuted(uint256 indexed proposalId)'
      ];

      this.contracts = {
        stablecoin: new ethers.Contract(AppConfig.contracts.stablecoin, erc20Abi, provider),
        governanceToken: new ethers.Contract(AppConfig.contracts.governanceToken, erc20Abi, provider),
        policyNFT: new ethers.Contract(AppConfig.contracts.policyNFT, policyNFTAbi, provider),
        claimsEngine: new ethers.Contract(AppConfig.contracts.claimsEngine, claimsEngineAbi, provider),
        governance: new ethers.Contract(AppConfig.contracts.governance, governanceAbi, provider),
        surplusDistributor: new ethers.Contract(AppConfig.contracts.surplusDistributor, erc20Abi, provider),
      };

      this.logger.log('Blockchain contracts initialized with fallback ABIs');
    } catch (error) {
      this.logger.error(`Failed to initialize fallback contracts: ${error.message}`);
    }
  }

  getContractAddresses() {
    return {
      stablecoin: AppConfig.contracts.stablecoin,
      governanceToken: AppConfig.contracts.governanceToken,
      policyNFT: AppConfig.contracts.policyNFT,
      claimsEngine: AppConfig.contracts.claimsEngine,
      governance: AppConfig.contracts.governance,
      surplusDistributor: AppConfig.contracts.surplusDistributor,
      juryOracle: AppConfig.contracts.juryOracle,
      voteTally: AppConfig.contracts.voteTally,
      appealSystem: AppConfig.contracts.appealSystem,
      parametricTriggers: AppConfig.contracts.parametricTriggers,
      network: AppConfig.blockchain.network,
      chainId: AppConfig.blockchain.chainId,
      rpcUrl: AppConfig.blockchain.rpcUrl,
    };
  }

  async submitClaim(claimData: any) {
    try {
      this.logger.log(`Submitting claim for policy ${claimData.policyTokenId}`);
      
      const amount = ethers.parseEther(claimData.amount.toString());
      const evidenceHashes = claimData.evidenceHashes || [];
      const claimType = this.getClaimTypeEnum(claimData.claimType || 'general');
      
      const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const config = this.blockchainService.getConfig();
      const claimTransactionData = {
        to: config.contracts.claimsEngine,
        data: this.contracts.claimsEngine.interface.encodeFunctionData('submitClaim', [
          claimData.policyTokenId || 0,
          claimType,
          amount,
          claimData.description || 'Claim submitted via frontend',
          evidenceHashes
        ]),
        value: '0',
        estimatedGas: '500000',
      };
      
      this.logger.log(`Claim transaction data prepared:`, claimTransactionData);
      
      return {
        success: true,
        message: 'Claim submission data prepared',
        claimData: {
          claimId: claimId,
          policyId: claimData.policyTokenId,
          claimType: claimData.claimType || 'general',
          amount: claimData.amount,
          description: claimData.description,
          evidenceHashes: evidenceHashes,
          userAddress: claimData.userAddress,
          submittedAt: new Date().toISOString()
        },
        transaction: claimTransactionData,
        contractAddress: config.contracts.claimsEngine,
        note: 'Send this transaction data to MetaMask or wallet for execution'
      };
      
    } catch (error) {
      this.logger.error(`Failed to submit claim: ${error.message}`);
      
      const config = this.blockchainService.getConfig();
      return {
        success: false,
        message: 'Claim submission failed',
        error: error.message,
        claimData: {
          claimId: `claim_error_${Date.now()}`,
          policyId: claimData.policyTokenId,
          claimType: claimData.claimType || 'general',
          amount: claimData.amount,
          description: claimData.description,
          evidenceHashes: claimData.evidenceHashes || [],
          userAddress: claimData.userAddress,
          submittedAt: new Date().toISOString()
        },
        blockchainResult: {
          contractAddresses: {
            claimsEngine: config.contracts.claimsEngine,
            governance: config.contracts.governance
          },
          transactions: {
            claimSubmission: {
              to: config.contracts.claimsEngine,
              data: '0x',
              value: '0',
              estimatedGas: '0',
              error: 'Transaction preparation failed'
            },
            governanceProposal: {
              to: config.contracts.governance,
              data: '0x',
              value: '0',
              estimatedGas: '0',
              error: 'Transaction preparation failed'
            }
          }
        },
        note: 'Claim saved to database but blockchain transaction preparation failed. Please try again later.'
      };
    }
  }

  private getClaimTypeEnum(claimType: string): number {
    const typeMap = {
      'general': 0,
      'health': 1,
      'vehicle': 2,
      'travel': 3,
      'product_warranty': 4,
      'pet': 5,
      'agricultural': 6
    };
    return typeMap[claimType] || 0;
  }

  // Add other necessary methods here...
  async getTokenBalances(address: string) {
    try {
      const balances = await Promise.all([
        this.getTokenInfo('stablecoin'),
        this.getTokenInfo('governanceToken'),
      ]);

      const [stablecoinBalance, governanceBalance] = await Promise.all([
        this.contracts.stablecoin.balanceOf(address),
        this.contracts.governanceToken.balanceOf(address),
      ]);

      return {
        address,
        tokens: {
          stablecoin: {
            ...balances[0],
            balance: ethers.formatEther(stablecoinBalance),
            balanceWei: stablecoinBalance.toString(),
          },
          governanceToken: {
            ...balances[1],
            balance: ethers.formatEther(governanceBalance),
            balanceWei: governanceBalance.toString(),
          },
        },
        nftPolicies: await this.getUserPolicies(address),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get token balances for ${address}: ${error.message}`);
      throw error;
    }
  }

  private async getTokenInfo(contractKey: string) {
    try {
      const contract = this.contracts[contractKey];
      const [name, symbol] = await Promise.all([
        contract.name(),
        contract.symbol(),
      ]);

      const result: any = { name, symbol };

      // Add total supply for ERC20 tokens
      if (contractKey !== 'policyNFT') {
        const totalSupply = await contract.totalSupply();
        result.totalSupply = ethers.formatEther(totalSupply);
        result.totalSupplyWei = totalSupply.toString();
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to get token info for ${contractKey}: ${error.message}`);
      return {
        name: 'Unknown',
        symbol: 'UNKNOWN',
        totalSupply: '0',
      };
    }
  }

  async getUserPolicies(address: string) {
    try {
      // This is a simplified version - in reality you'd need to track policy ownership
      return [];
    } catch (error) {
      this.logger.error(`Failed to get user policies for ${address}: ${error.message}`);
      return [];
    }
  }
}
