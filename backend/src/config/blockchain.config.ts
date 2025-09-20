import { registerAs } from '@nestjs/config';

export const blockchainConfig = registerAs('blockchain', () => ({
  // Network configuration
  network: process.env.BLOCKCHAIN_NETWORK || 'arbitrum_sepolia',
  chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID, 10) || 421614,
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
  
  // Private key for backend operations (should be secured)
  privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
  
  // Contract addresses - DEPLOYED ON ARBITRUM SEPOLIA
  contracts: {
    stablecoin: process.env.CONTRACT_STABLECOIN || '0x7438af9FC68fE976e33029E570720d19A975baC7',
    governanceToken: process.env.CONTRACT_GOV_TOKEN || '0x9B3A8167eb01246688705FC1C11F81Efa7350fc5',
    policyNFT: process.env.CONTRACT_POLICY_NFT || '0x7596B7c1Ad9490275eC143a6bc1bbd495e338A8C',
    claimsEngine: process.env.CONTRACT_CLAIMS_ENGINE || '0x54A4c8006272fDeA157950421ceBeb510387af83',
    surplusDistributor: process.env.CONTRACT_SURPLUS || '0x41A34F8150226c57E613A07B9750EB5dA0076317',
    governance: process.env.CONTRACT_GOVERNANCE || '0xe3ca0A9B4D66b8dCf7B44c914Bd2c97b2a379D78',
    juryOracle: process.env.CONTRACT_JURY_ORACLE || '0xA5ed6d4057D73B4D3F6fb0A6ec71334FD932eFE1',
    voteTally: process.env.CONTRACT_VOTE_TALLY || '0xAAe39523b50aC68AF0710Fa84ff28934F09e61C5',
    appealSystem: process.env.CONTRACT_APPEAL_SYSTEM || '0x2Ad335BB9Ee03d71c1b6183ddd0BB92642118503',
    parametricTriggers: process.env.CONTRACT_PARAMETRIC_TRIGGERS || '0x037E960c64a5d37614a204fB6a27620Bc8076A4b',
  },
  
  // Gas configuration
  gasLimit: parseInt(process.env.BLOCKCHAIN_GAS_LIMIT, 10) || 500000,
  gasPrice: process.env.BLOCKCHAIN_GAS_PRICE || '20000000000', // 20 gwei
  
  // Block confirmation requirements
  confirmations: parseInt(process.env.BLOCKCHAIN_CONFIRMATIONS, 10) || 3,
  
  // Polling intervals
  blockPollingInterval: parseInt(process.env.BLOCKCHAIN_BLOCK_POLLING_INTERVAL, 10) || 15000, // 15 seconds
  eventPollingInterval: parseInt(process.env.BLOCKCHAIN_EVENT_POLLING_INTERVAL, 10) || 30000, // 30 seconds
  
  // Explorer URLs
  explorerUrl: process.env.BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.arbiscan.io',
  
  // API keys
  arbiscanApiKey: process.env.ARBISCAN_API_KEY,
})); 