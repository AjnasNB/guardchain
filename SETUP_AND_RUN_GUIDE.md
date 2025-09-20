# 🚀 GuardChain AI Platform Setup & Running Guide

## 📋 **Overview**
This guide covers setting up and running the complete GuardChain AI mutual insurance platform including blockchain contracts (on Arbitrum Sepolia), AI service, backend API, and frontend application.

---

## 🏗️ **Quick Start (Development)**

### **1. Clone and Setup**
```bash
# Clone repository
git clone <your-repo-url>
cd bnb

# Install all dependencies
./setup.sh  # or run individual setups below
```

### **2. Environment Setup**

#### **AI Service (.env)**
```bash
cd ai-service
cp env-template.txt .env

# Edit .env with your settings:
GOOGLE_API_KEY=AIzaSyA9mhQYZe3WjYBlm2gPejBxtYANXkf4USc
GEMINI_MODEL=gemini-2.0-flash-exp
API_KEY=chainsure_dev_key_2024
LOG_LEVEL=INFO
```

#### **Backend (.env)**
```bash
cd ../backend
cp env-template.txt .env

# Edit .env with your settings:
NODE_ENV=development
PORT=3000
DATABASE_URL=sqlite:./chainsure.db
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=chainsure_dev_key_2024
```

#### **Blockchain (.env)**
```bash
cd ../blockchain
cp env-template.txt .env

# Edit .env with your deployment settings (Arbitrum Sepolia):
PRIVATE_KEY=your_private_key_here
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=your_arbiscan_api_key_here
```

### **3. Install Dependencies**
```bash
# AI Service
cd ai-service
pip install -r requirements.txt

# Backend
cd ../backend
npm install

# Blockchain
cd ../blockchain
npm install

# Frontend
cd ../frontend
npm install
```

---

## 🚀 **Running the Platform (Development)**

### **Start All Services (Recommended)**
```bash
# Option 1: Use docker-compose (if available)
docker-compose up -d

# Option 2: Start manually in separate terminals
```

### **Manual Startup (4 terminals needed)**

#### **Terminal 1: AI Service**
```bash
cd ai-service
python main.py

# Service will start on: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

#### **Terminal 2: Backend API**
```bash
cd backend
npm run start:dev

# Service will start on: http://localhost:3000
# API Docs: http://localhost:3000/api/docs
# Health Check: http://localhost:3000/api/v1/health
```

#### **Terminal 3: Frontend**
```bash
cd frontend
npm run dev

# Service will start on: http://localhost:3001
```

#### **Terminal 4: Blockchain (Local Node)**
```bash
cd blockchain
# Optional: local node for quick testing
npx hardhat node

# For Arbitrum Sepolia deployment use the next section
```

---

## ⛓️ **Blockchain Deployment (Arbitrum Sepolia)**

### **Step 1: Local Testing**
```bash
cd blockchain

# Start local blockchain
npx hardhat node

# Deploy to local network
npx hardhat run scripts/test-deploy.js --network localhost
```

### **Step 2: Arbitrum Sepolia Deployment**
```bash
# Fund your deployer wallet (Arbitrum Sepolia ETH)
# Faucet: https://faucet.quicknode.com/arbitrum/sepolia  (or official Arbitrum testnet faucets)

# Set environment
cd blockchain
cp env-template.txt .env
# Ensure PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC are set in .env

# Deploy to Arbitrum Sepolia
npx hardhat run scripts/deploy.js --network arbitrumSepolia

# Verify contracts on Arbiscan
npx hardhat verify --network arbitrumSepolia <DEPLOYED_ADDRESS> <constructor args if any>
```

### **Why Arbitrum?**
- Low gas fees and fast finality
- Mature ecosystem and tooling
- EVM compatibility: reuse the same smart contracts

---

## 🔧 **Configuration After Deployment**

### **1. Update Backend with Contract Addresses**
After blockchain deployment, update `backend/src/config/blockchain.config.ts`:

```typescript
export const blockchainConfig = {
  network: 'arbitrum_sepolia',
  chainId: 421614,
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  contracts: {
    stablecoin: "0x...",      // From deployment output
    governanceToken: "0x...",  // From deployment output
    policyNFT: "0x...",       // From deployment output
    claimsEngine: "0x...",    // From deployment output
    surplusDistributor: "0x...", // From deployment output
    governance: "0x..."       // From deployment output
  }
};
```

### **2. Update Frontend with ABIs and Addresses**
Copy generated ABIs and addresses to frontend:
```bash
cp blockchain/abis/* frontend/contracts/abi/
echo '{"chainId":421614,"network":"arbitrum_sepolia","contracts":{...}}' > frontend/config/contracts.json
```

### **3. Configure AI Service Integration**
Update backend to use AI service endpoints:
```typescript
// In backend/src/config/ai.config.ts
export const aiConfig = {
  baseUrl: "http://localhost:8000",
  apiKey: "chainsure_dev_key_2024",
  endpoints: {
    geminiAnalyze: "/gemini-analyze",
    geminiImageAnalysis: "/gemini-image-analysis",
    geminiPolicyValidation: "/gemini-policy-validation"
  }
};
```

---

## 🌐 **Production Deployment**

### **Infrastructure Requirements**
- **Server**: 4GB RAM, 2 CPU cores minimum
- **Storage**: 50GB SSD
- **Network**: Stable internet with low latency
- **Domain**: SSL certificate for HTTPS

### **Production Environment Variables**

#### **AI Service (Production)**
```bash
# ai-service/.env
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
GOOGLE_API_KEY=AIzaSyA9mhQYZe3WjYBlm2gPejBxtYANXkf4USc
GEMINI_MODEL=gemini-2.0-flash-exp
API_KEY=your_secure_production_api_key
LOG_LEVEL=INFO
```

#### **Backend (Production)**
```bash
# backend/.env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/chainsure
AI_SERVICE_URL=https://your-ai-service.com
FRONTEND_URL=https://your-frontend.com
JWT_SECRET=your_secure_jwt_secret
```

### **Docker Deployment (Recommended)**
```bash
# Build and run with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or build individual services
docker build -t chainsure-ai ./ai-service
docker build -t chainsure-backend ./backend
docker build -t chainsure-frontend ./frontend
```

### **Manual Production Deployment**

#### **1. AI Service (Ubuntu/Linux)**
```bash
# Install Python and dependencies
sudo apt update
sudo apt install python3 python3-pip
pip3 install -r ai-service/requirements.txt

# Run with gunicorn
cd ai-service
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### **2. Backend (Ubuntu/Linux)**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Start backend
cd backend
npm install --production
npm run build
pm2 start dist/main.js --name chainsure-backend
```

#### **3. Frontend (Static Hosting)**
```bash
# Build for production
cd frontend
npm run build

# Deploy to your hosting provider (Vercel, Netlify, etc.)
# Or serve with nginx
```

---

## 🔍 **Testing & Verification**

### **1. Service Health Checks**
```bash
# AI Service
curl http://localhost:8000/health

# Backend
curl http://localhost:3000/api/v1/health

# Frontend
curl http://localhost:3001
```

### **2. API Testing**
```bash
# Test AI Service Gemini Integration
curl -X POST "http://localhost:8000/gemini-analyze" \
  -H "Authorization: Bearer chainsure_dev_key_2024" \
  -H "Content-Type: application/json" \
  -d '{"document_text": "Test claim document", "claim_type": "health"}'

# Test Backend API
curl http://localhost:3000/api/v1/health
```

### **3. Blockchain Testing**
```bash
cd blockchain

# Run contract tests
npx hardhat test

# Test deployed contracts on Arbitrum Sepolia
npx hardhat run scripts/test-interactions.js --network arbitrumSepolia
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Port Conflicts**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8000
lsof -i :3001

# Kill processes if needed
kill -9 <PID>
```

#### **2. Database Issues**
```bash
# Reset SQLite database
cd backend
rm chainsure.db
npm run migration:run
```

#### **3. AI Service Connection Issues**
```bash
# Check Google API key
export GOOGLE_API_KEY=AIzaSyA9mhQYZe3WjYBlm2gPejBxtYANXkf4USc
python -c "import google.generativeai as genai; genai.configure(api_key='$GOOGLE_API_KEY'); print('API key works!')"
```

#### **4. Blockchain Connection Issues**
```bash
# Test RPC connection (Arbitrum Sepolia)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://sepolia-rollup.arbitrum.io/rpc
```

### **Logs and Debugging**

#### **AI Service Logs**
```bash
tail -f ai-service/logs/ai_service.log
tail -f ai-service/logs/errors.log
```

#### **Backend Logs**
```bash
# Development
npm run start:dev  # Logs to console

# Production
pm2 logs chainsure-backend
```

#### **Blockchain Logs**
```bash
# Local node logs
npx hardhat node --verbose

# Contract interaction logs
npx hardhat console --network bsc-testnet
```

---

## 📊 **Monitoring & Maintenance**

### **Production Monitoring**
1. **Service Uptime**: Monitor all 3 services (AI, Backend, Frontend)
2. **API Response Times**: Track response times for all endpoints
3. **Error Rates**: Monitor error logs and failure rates
4. **Blockchain Interactions**: Monitor gas usage and transaction success

### **Regular Maintenance**
1. **Database Backups**: Regular backups of user data
2. **Log Rotation**: Prevent log files from growing too large
3. **Security Updates**: Keep dependencies updated
4. **Contract Upgrades**: Plan for smart contract upgrades via governance

---

## 🎯 **Success Indicators**

When everything is running correctly, you should see:

✅ **AI Service**: Responding at http://localhost:8000/docs  
✅ **Backend API**: Responding at http://localhost:3000/api/docs  
✅ **Frontend**: Loading at http://localhost:3001  
✅ **Blockchain**: Contracts deployed to Arbitrum Sepolia and verified  
✅ **Integration**: All services communicating properly  

### **Test the Complete Flow**
1. Create a policy NFT via frontend
2. Submit a claim with documents
3. AI service processes the claim
4. Backend stores results
5. Jury voting (if applicable)
6. Claim payout processed

---

## 📞 **Getting Help**

- **Documentation**: Check README files in each service directory
- **API Docs**: Visit `/docs` endpoints for interactive API documentation
- **Logs**: Always check service logs for detailed error information
- **Community**: Create GitHub issues for bugs or feature requests

**🎉 Congratulations!** Your ChainSure platform should now be fully operational! 