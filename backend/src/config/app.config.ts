export const AppConfig = {
  // Application Settings
  app: {
    name: 'GuardChain AI Backend',
    version: '2.0.0',
    port: process.env.PORT || 3001,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Database Configuration
  database: {
    path: process.env.DATABASE_PATH || 'db/guardchain.db',
    logging: process.env.DATABASE_LOGGING === 'true' || false,
    synchronize: true,
    autoLoadEntities: true,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'guardchain-secret-key-development-only',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'guardchain-refresh-secret-development-only',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Blockchain Configuration (Arbitrum Sepolia)
  blockchain: {
    network: 'arbitrumSepolia',
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    gasLimit: 500000,
    gasPrice: '20000000000', // 20 gwei
    confirmations: 3,
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '', // Will be set from env or user input
  },

  // DEPLOYED SMART CONTRACT ADDRESSES (ARBITRUM SEPOLIA)
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

  // AI Service Configuration
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8001',
    apiKey: process.env.AI_SERVICE_API_KEY || 'guardchain_backend_key_2024',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000'),
    fraudThreshold: parseInt(process.env.AI_FRAUD_THRESHOLD || '80'),
    confidenceThreshold: parseInt(process.env.AI_CONFIDENCE_THRESHOLD || '70'),
    enableFraudDetection: process.env.AI_ENABLE_FRAUD_DETECTION !== 'false',
    enableDocumentAnalysis: process.env.AI_ENABLE_DOCUMENT_ANALYSIS !== 'false',
    enableImageAnalysis: process.env.AI_ENABLE_IMAGE_ANALYSIS !== 'false',
    maxFileSize: parseInt(process.env.AI_MAX_FILE_SIZE || '52428800'), // 50MB
    allowedFileTypes: (process.env.AI_ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,bmp,tiff').split(','),
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    sessionSecret: process.env.SESSION_SECRET || 'guardchain-session-secret-development-only',
    webhookSecret: process.env.WEBHOOK_SECRET || 'guardchain-webhook-secret',
    corsOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      process.env.FRONTEND_URL || 'http://localhost:3001',
      // Allow all origins in development
      ...(process.env.NODE_ENV === 'development' ? ['*'] : [])
    ],
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per minute
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
    uploadPath: process.env.UPLOAD_PATH || 'uploads',
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/bmp',
      'image/tiff',
    ],
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Email Configuration
  email: {
    from: process.env.EMAIL_FROM || 'noreply@guardchain.com',
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true',
    },
  },

  // Feature Flags
  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION !== 'false',
    enable2FA: process.env.ENABLE_2FA === 'true',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
  },

  // Maintenance
  maintenance: {
    mode: process.env.MAINTENANCE_MODE === 'true',
    message: process.env.MAINTENANCE_MESSAGE || 'System is under maintenance. Please try again later.',
  },

  // External Services
  external: {
    ipfsGateway: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs',
    analyticsProvider: process.env.ANALYTICS_PROVIDER || 'internal',
  },

  // Business Rules
  business: {
    minimumStakeAmount: '1000000000000000000000', // 1000 tokens
    maximumClaimAmount: '100000000000000000000000', // 100k tokens
    claimProcessingTimeout: 24 * 60 * 60 * 1000, // 24 hours
    policyValidityPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
    juryVotingPeriod: 3 * 24 * 60 * 60 * 1000, // 3 days
    minimumJurySize: 5,
    maximumJurySize: 15,
    consensusThreshold: 60, // 60% for approval
  },
};

export default AppConfig; 