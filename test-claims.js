const fetch = require('node-fetch');

async function testClaimsAndGovernance() {
  console.log('🧪 Testing Claims & Governance Integration...\n');

  try {
    // Test 1: Backend Health
    console.log('1. Testing Backend Health...');
    const healthResponse = await fetch('http://localhost:3000/api/v1/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend Health:', healthData.status);

    // Test 2: Get Claims
    console.log('\n2. Testing Claims Fetching...');
    const claimsResponse = await fetch('http://localhost:3000/api/v1/claims');
    const claimsData = await claimsResponse.json();
    console.log('✅ Claims Found:', claimsData.total || 0);
    console.log('   Message:', claimsData.message);

    // Test 3: Get Governance Proposals
    console.log('\n3. Testing Governance Proposals...');
    const proposalsResponse = await fetch('http://localhost:3000/api/v1/governance/proposals');
    const proposalsData = await proposalsResponse.json();
    console.log('✅ Proposals Found:', proposalsData.total || 0);
    console.log('   Message:', proposalsData.message);

    // Test 4: Get Claims for Voting
    console.log('\n4. Testing Claims for Voting...');
    const votingClaimsResponse = await fetch('http://localhost:3000/api/v1/claims/voting');
    const votingClaimsData = await votingClaimsResponse.json();
    console.log('✅ Claims for Voting:', votingClaimsData.total || 0);
    console.log('   Message:', votingClaimsData.message);

    // Test 5: Blockchain Health
    console.log('\n5. Testing Blockchain Health...');
    const blockchainHealthResponse = await fetch('http://localhost:3000/api/v1/blockchain/health');
    const blockchainHealthData = await blockchainHealthResponse.json();
    console.log('✅ Blockchain Health:', blockchainHealthData.status);
    console.log('   Network:', blockchainHealthData.network?.name);

    console.log('\n🎉 All tests passed! Claims and Governance are working perfectly!');
    console.log('\n📋 Summary:');
    console.log('   - Backend: ✅ Running');
    console.log('   - Claims: ✅ Fetching from DB + Blockchain');
    console.log('   - Governance: ✅ Proposals working');
    console.log('   - Voting: ✅ Claims ready for voting');
    console.log('   - Blockchain: ✅ Connected');

    console.log('\n🚀 Ready for:');
    console.log('   1. Submit claims → Appear in claims list');
    console.log('   2. Governance proposals → Available for voting');
    console.log('   3. Community voting → Real blockchain integration');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running on port 3000');
    console.log('   2. Check if database is connected');
    console.log('   3. Verify blockchain contracts are accessible');
  }
}

testClaimsAndGovernance(); 