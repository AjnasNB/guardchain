# ChainSure Smart Contract Deployment Guide

## 🎯 **Overview**
This guide walks you through deploying ChainSure's mutual insurance platform contracts on Binance Smart Chain (BSC).

## 📋 **Prerequisites**

### 1. Setup Environment
```bash
cd blockchain
npm install
```

### 2. Configure Environment Variables
Copy `env-template.txt` to `.env` and fill in your details:

```bash
# Required for deployment
PRIVATE_KEY=your_wallet_private_key_here
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Contract Configuration
INITIAL_SUPPLY=1000000000000000000000000  # 1M tokens with 18 decimals
STABLECOIN_NAME="ChainSure INR"
STABLECOIN_SYMBOL="CSINR"
GOVERNANCE_TOKEN_NAME="ChainSure Governance Token"
GOVERNANCE_TOKEN_SYMBOL="CSGT"
```

### 3. Get BNB for Gas Fees
- **Testnet**: Get free BNB from [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart)
- **Mainnet**: Purchase BNB on any exchange and send to your deployment wallet

## 🏗️ **Deployment Order**

The contracts must be deployed in the following order due to dependencies:

### **Phase 1: Core Tokens**
1. **ChainSureStablecoin** (CSINR) - INR-pegged stablecoin
2. **ChainSureGovernanceToken** (CSGT) - Voting and staking token

### **Phase 2: Core Contracts**
3. **ChainSurePolicyNFT** - Insurance policies as NFTs
4. **ChainSureClaimsEngine** - Claims processing with AI and jury
5. **ChainSureSurplusDistributor** - Profit sharing mechanism

### **Phase 3: Governance**
6. **ChainSureGovernance** - Community voting and proposals

## 🚀 **Deployment Commands**

### **BSC Testnet Deployment**
```bash
# Deploy all contracts to testnet
npm run deploy:testnet

# Or deploy individually
npx hardhat run scripts/deploy.js --network bsc-testnet
```

### **BSC Mainnet Deployment**
```bash
# Deploy all contracts to mainnet (CAREFUL!)
npm run deploy:mainnet

# Or deploy individually  
npx hardhat run scripts/deploy.js --network bsc-mainnet
```

### **Local Testing**
```bash
# Test deployment locally first
npx hardhat run scripts/test-deploy.js --network localhost
```

## 🔍 **Contract Verification**

After deployment, verify contracts on BscScan:

```bash
# Verify all deployed contracts
npm run verify:contracts

# Or verify individually
npx hardhat run scripts/verify.js --network bsc-testnet
```

## 📋 **Post-Deployment Checklist**

### **1. Contract Permissions**
- [ ] Set ClaimsEngine as minter for Stablecoin
- [ ] Set Governance contract as admin for all contracts
- [ ] Configure oracle addresses for parametric claims
- [ ] Set up initial jury pool with governance tokens

### **2. Initial Configuration**
- [ ] Set minimum staking amounts
- [ ] Configure claim processing timeouts
- [ ] Set initial coverage types and limits
- [ ] Configure AI service endpoints

### **3. Governance Setup**
- [ ] Create initial governance proposals
- [ ] Distribute initial governance tokens
- [ ] Set proposal thresholds and voting periods

## 🏦 **Contract Addresses**

After deployment, save these addresses for frontend/backend integration:

```json
{
  "ChainSureStablecoin": "0x...",
  "ChainSureGovernanceToken": "0x...",
  "ChainSurePolicyNFT": "0x...",
  "ChainSureClaimsEngine": "0x...",
  "ChainSureSurplusDistributor": "0x...",
  "ChainSureGovernance": "0x..."
}
```

These will be automatically saved to `deployments/addresses.json`.

## 🔧 **Integration with Backend**

1. **Copy ABIs**: Deployment script automatically generates ABIs in `abi/` folder
2. **Update Backend Config**: Add contract addresses to `backend/src/config/blockchain.config.ts`
3. **Update Frontend**: Copy ABIs and addresses to frontend project

## 📊 **Network Information**

### **BSC Testnet**
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Chain ID**: 97
- **Currency**: BNB
- **Block Explorer**: https://testnet.bscscan.com/

### **BSC Mainnet**
- **RPC URL**: https://bsc-dataseed1.binance.org/
- **Chain ID**: 56
- **Currency**: BNB  
- **Block Explorer**: https://bscscan.com/

## 💰 **Estimated Gas Costs**

### **Testnet Deployment** (Free)
- Total Gas: ~8,000,000 gas
- Cost: Free (testnet BNB)

### **Mainnet Deployment**
- Total Gas: ~8,000,000 gas
- Estimated Cost: ~0.08 BNB (varies with gas price)
- Current BNB Price Check: [CoinGecko](https://www.coingecko.com/en/coins/bnb)

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **"Insufficient funds for gas"**
   - Solution: Add more BNB to your deployment wallet

2. **"Contract verification failed"**
   - Solution: Wait 1-2 minutes after deployment before verifying
   - Check constructor arguments match deployment

3. **"RPC connection failed"**
   - Solution: Try different RPC endpoints or check internet connection

4. **"Private key invalid"**
   - Solution: Ensure private key is 64 characters (without 0x prefix)

### **Emergency Procedures**

If deployment fails mid-process:

1. Check which contracts deployed successfully
2. Update deployment script to skip completed deployments
3. Resume from failed contract
4. Update contract addresses and permissions

## 🔒 **Security Best Practices**

1. **Private Key Management**
   - Never commit private keys to git
   - Use hardware wallets for mainnet
   - Consider multi-sig for admin functions

2. **Contract Verification**
   - Always verify contracts on BscScan
   - Check constructor parameters
   - Ensure source code matches deployed bytecode

3. **Testing**
   - Test thoroughly on testnet first
   - Run test suite before mainnet deployment
   - Simulate all user interactions

## 📞 **Support**

If you encounter issues:
1. Check the [Hardhat Documentation](https://hardhat.org/docs)
2. Review [BSC Documentation](https://docs.bnbchain.org/)
3. Check existing GitHub issues
4. Create new issue with deployment logs

---

**⚠️ Important**: Always deploy to testnet first and thoroughly test all functionality before mainnet deployment! 