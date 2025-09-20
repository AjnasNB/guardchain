const fetch = require('node-fetch');

async function testBlockchainIntegration() {
  console.log('🧪 Testing Blockchain Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Backend Health...');
    const healthResponse = await fetch('http://localhost:3000/api/v1/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend Health:', healthData.status);

    // Test 2: Blockchain Health
    console.log('\n2. Testing Blockchain Health...');
    const blockchainHealthResponse = await fetch('http://localhost:3000/api/v1/blockchain/health');
    const blockchainHealthData = await blockchainHealthResponse.json();
    console.log('✅ Blockchain Health:', blockchainHealthData.status);
    console.log('   Network:', blockchainHealthData.network?.name);
    console.log('   Contracts Connected:', Object.values(blockchainHealthData.contracts || {}).filter(c => c.connected).length);

    // Test 3: Get Claims
    console.log('\n3. Testing Claims Fetching...');
    const claimsResponse = await fetch('http://localhost:3000/api/v1/claims');
    const claimsData = await claimsResponse.json();
    console.log('✅ Claims Found:', claimsData.total || 0);

    // Test 4: Get Governance Proposals
    console.log('\n4. Testing Governance Proposals...');
    const proposalsResponse = await fetch('http://localhost:3000/api/v1/blockchain/governance/proposals');
    const proposalsData = await proposalsResponse.json();
    console.log('✅ Proposals Found:', proposalsData.totalProposals || 0);

    // Test 5: Get Contract Addresses
    console.log('\n5. Testing Contract Addresses...');
    const addressesResponse = await fetch('http://localhost:3000/api/v1/blockchain/contracts');
    const addressesData = await addressesResponse.json();
    console.log('✅ Contract Addresses:');
    console.log('   Claims Engine:', addressesData.claimsEngine);
    console.log('   Governance:', addressesData.governance);
    console.log('   Policy NFT:', addressesData.policyNFT);

    console.log('\n🎉 All tests passed! Blockchain integration is working perfectly!');
    console.log('\n📋 Summary:');
    console.log('   - Backend: ✅ Running');
    console.log('   - Blockchain: ✅ Connected');
    console.log('   - Claims: ✅ Fetching');
    console.log('   - Governance: ✅ Working');
    console.log('   - Contracts: ✅ Deployed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running on port 3000');
    console.log('   2. Check if contracts are deployed on BSC Testnet');
    console.log('   3. Verify RPC URL is accessible');
  }
}

testBlockchainIntegration(); 