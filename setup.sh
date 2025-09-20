#!/bin/bash

# ChainSure Platform Setup Script
# Automates the installation and configuration of all platform components

set -e  # Exit on any error

echo "🚀 Starting ChainSure Platform Setup..."
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.8+ first."
        exit 1
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 is not installed. Please install pip3 first."
        exit 1
    fi
    
    print_status "Prerequisites check passed!"
}

# Setup AI Service
setup_ai_service() {
    print_info "Setting up AI Service..."
    
    cd ai-service
    
    # Copy environment template
    if [ ! -f .env ]; then
        cp env-template.txt .env
        print_status "Created AI service .env file"
    else
        print_warning "AI service .env file already exists"
    fi
    
    # Install Python dependencies
    print_info "Installing Python dependencies..."
    pip3 install -r requirements.txt
    
    print_status "AI Service setup complete!"
    cd ..
}

# Setup Backend
setup_backend() {
    print_info "Setting up Backend..."
    
    cd backend
    
    # Copy environment template
    if [ ! -f .env ]; then
        cp env-template.txt .env
        print_status "Created backend .env file"
    else
        print_warning "Backend .env file already exists"
    fi
    
    # Install Node.js dependencies
    print_info "Installing Node.js dependencies..."
    npm install
    
    print_status "Backend setup complete!"
    cd ..
}

# Setup Blockchain
setup_blockchain() {
    print_info "Setting up Blockchain..."
    
    cd blockchain
    
    # Copy environment template
    if [ ! -f .env ]; then
        cp env-template.txt .env
        print_status "Created blockchain .env file"
    else
        print_warning "Blockchain .env file already exists"
    fi
    
    # Install Node.js dependencies
    print_info "Installing Hardhat and dependencies..."
    npm install
    
    print_status "Blockchain setup complete!"
    cd ..
}

# Setup Frontend
setup_frontend() {
    print_info "Setting up Frontend..."
    
    cd frontend
    
    # Install Node.js dependencies
    print_info "Installing Next.js dependencies..."
    npm install
    
    print_status "Frontend setup complete!"
    cd ..
}

# Create directories if needed
create_directories() {
    print_info "Creating necessary directories..."
    
    # AI Service logs
    mkdir -p ai-service/logs
    
    # Backend directories
    mkdir -p backend/uploads
    mkdir -p backend/logs
    
    # Blockchain directories
    mkdir -p blockchain/deployments
    mkdir -p blockchain/abi
    
    print_status "Directories created!"
}

# Setup environment files with proper configuration
configure_environment() {
    print_info "Configuring environment files..."
    
    # Configure AI service
    cat > ai-service/.env << EOF
# AI Service Configuration
GOOGLE_API_KEY=AIzaSyA9mhQYZe3WjYBlm2gPejBxtYANXkf4USc
GEMINI_MODEL=gemini-2.0-flash-exp
API_KEY=chainsure_dev_key_2024
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000
DEBUG=true
ENVIRONMENT=development

# External Services
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# AI Model Configuration  
MODEL_CACHE_DIR=./models/cache
MAX_FILE_SIZE_MB=10
SUPPORTED_FORMATS=pdf,jpg,jpeg,png,tiff

# Logging
LOG_FILE=./logs/ai_service.log
ERROR_LOG_FILE=./logs/errors.log
PERFORMANCE_LOG_FILE=./logs/performance.log
EOF
    
    # Configure backend
    cat > backend/.env << EOF
# Backend Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=sqlite:./chainsure.db

# Security
JWT_SECRET=chainsure_jwt_secret_dev_2024
JWT_EXPIRES_IN=24h

# External Services
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=chainsure_dev_key_2024
FRONTEND_URL=http://localhost:3001

# Blockchain Configuration
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/backend.log
EOF
    
    # Configure blockchain (user needs to add private key manually)
    cat > blockchain/.env << EOF
# Blockchain Configuration
# ⚠️ IMPORTANT: Add your private key below (without 0x prefix)
PRIVATE_KEY=your_private_key_here_64_characters

# RPC URLs
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/

# API Keys
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Contract Configuration
INITIAL_SUPPLY=1000000000000000000000000
STABLECOIN_NAME=ChainSure INR
STABLECOIN_SYMBOL=CSINR
GOVERNANCE_TOKEN_NAME=ChainSure Governance Token
GOVERNANCE_TOKEN_SYMBOL=CSGT
EOF
    
    print_status "Environment files configured!"
}

# Display next steps
display_next_steps() {
    echo ""
    echo "🎉 ChainSure Platform Setup Complete!"
    echo "======================================"
    echo ""
    print_info "Next steps:"
    echo ""
    echo "1. 🔐 Configure your private key in blockchain/.env"
    echo "   PRIVATE_KEY=your_wallet_private_key_here"
    echo ""
    echo "2. 🎯 Start the services (in separate terminals):"
    echo ""
    echo "   Terminal 1 - AI Service:"
    echo "   cd ai-service && python main.py"
    echo ""
    echo "   Terminal 2 - Backend:"
    echo "   cd backend && npm run start:dev"
    echo ""
    echo "   Terminal 3 - Frontend:"
    echo "   cd frontend && npm run dev"
    echo ""
    echo "   Terminal 4 - Blockchain (optional):"
    echo "   cd blockchain && npx hardhat node"
    echo ""
    echo "3. 🌐 Access the platform:"
    echo "   • Frontend:  http://localhost:3001"
    echo "   • Backend:   http://localhost:3000/api/docs"
    echo "   • AI Service: http://localhost:8000/docs"
    echo ""
    echo "4. 📖 Read the complete guide:"
    echo "   • Setup Guide: ./SETUP_AND_RUN_GUIDE.md"
    echo "   • Deployment: ./blockchain/DEPLOYMENT_GUIDE.md"
    echo ""
    print_status "Happy coding! 🚀"
}

# Main execution
main() {
    check_prerequisites
    create_directories
    setup_ai_service
    setup_backend
    setup_blockchain
    setup_frontend
    configure_environment
    display_next_steps
}

# Run main function
main "$@" 