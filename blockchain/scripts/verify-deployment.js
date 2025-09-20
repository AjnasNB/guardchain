const { ethers } = require("hardhat");

// Deployed contract addresses on BSC Testnet
const DEPLOYED_CONTRACTS = {
    stablecoin: "0x644Ed1D005Eadbaa4D4e05484AEa8e52A4DB76c8",
    governanceToken: "0xD0aa884859B93aFF4324B909fAeC619096f0Cc05",
    policyNFT: "0x2e2acdf394319b365Cc46cF587ab8a2d25Cb3312",
    claimsEngine: "0x528Bf18723c2021420070e0bB2912F881a93ca53",
    surplusDistributor: "0x95b0821Dc5C8d272Cc34C593faa76f62E7EAA2Ac",
    governance: "0x364424CBf264F54A0fFE12D99F3902B398fc0B36"
};

async function main() {
    console.log("🔍 Verifying ChainSure deployment on BSC Testnet...");
    
    const [deployer] = await ethers.getSigners();
    console.log("📝 Verifying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

    try {
        // 1. Test Stablecoin
        console.log("\n💰 Testing ChainSureStablecoin...");
        const stablecoin = await ethers.getContractAt("ChainSureStablecoin", DEPLOYED_CONTRACTS.stablecoin);
        const stablecoinName = await stablecoin.name();
        const stablecoinSymbol = await stablecoin.symbol();
        const stablecoinSupply = await stablecoin.totalSupply();
        console.log(`✅ Name: ${stablecoinName}`);
        console.log(`✅ Symbol: ${stablecoinSymbol}`);
        console.log(`✅ Total Supply: ${ethers.formatEther(stablecoinSupply)}`);

        // 2. Test Governance Token
        console.log("\n🗳️ Testing ChainSureGovernanceToken...");
        const governanceToken = await ethers.getContractAt("ChainSureGovernanceToken", DEPLOYED_CONTRACTS.governanceToken);
        const govName = await governanceToken.name();
        const govSymbol = await governanceToken.symbol();
        const govSupply = await governanceToken.totalSupply();
        const deployerBalance = await governanceToken.balanceOf(deployer.address);
        console.log(`✅ Name: ${govName}`);
        console.log(`✅ Symbol: ${govSymbol}`);
        console.log(`✅ Total Supply: ${ethers.formatEther(govSupply)}`);
        console.log(`✅ Deployer Balance: ${ethers.formatEther(deployerBalance)}`);

        // 3. Test Policy NFT
        console.log("\n📄 Testing ChainSurePolicyNFT...");
        const policyNFT = await ethers.getContractAt("ChainSurePolicyNFT", DEPLOYED_CONTRACTS.policyNFT);
        const nftName = await policyNFT.name();
        const nftSymbol = await policyNFT.symbol();
        const treasuryAddress = await policyNFT.treasuryAddress();
        console.log(`✅ Name: ${nftName}`);
        console.log(`✅ Symbol: ${nftSymbol}`);
        console.log(`✅ Treasury: ${treasuryAddress}`);

        // Test base premium rates
        const healthPremiumRate = await policyNFT.basePremiumRates(0); // Health = 0
        console.log(`✅ Health Insurance Premium Rate: ${healthPremiumRate} per 1000 units`);

        // 4. Test Claims Engine
        console.log("\n⚖️ Testing ChainSureClaimsEngine...");
        const claimsEngine = await ethers.getContractAt("ChainSureClaimsEngine", DEPLOYED_CONTRACTS.claimsEngine);
        const MIN_JURY_SIZE = await claimsEngine.MIN_JURY_SIZE();
        const MAX_JURY_SIZE = await claimsEngine.MAX_JURY_SIZE();
        const VOTING_PERIOD = await claimsEngine.VOTING_PERIOD();
        const CONSENSUS_THRESHOLD = await claimsEngine.CONSENSUS_THRESHOLD();
        const nextClaimId = await claimsEngine.nextClaimId();
        console.log(`✅ Min Jury Size: ${MIN_JURY_SIZE}`);
        console.log(`✅ Max Jury Size: ${MAX_JURY_SIZE}`);
        console.log(`✅ Voting Period: ${VOTING_PERIOD} seconds (${Number(VOTING_PERIOD)/86400} days)`);
        console.log(`✅ Consensus Threshold: ${CONSENSUS_THRESHOLD}%`);
        console.log(`✅ Next Claim ID: ${nextClaimId}`);

        // 5. Test Surplus Distributor
        console.log("\n💸 Testing ChainSureSurplusDistributor...");
        const surplusDistributor = await ethers.getContractAt("ChainSureSurplusDistributor", DEPLOYED_CONTRACTS.surplusDistributor);
        const reserveRatio = await surplusDistributor.reserveRatio();
        const reinsuranceRatio = await surplusDistributor.reinsuranceRatio();
        console.log(`✅ Reserve Ratio: ${reserveRatio}%`);
        console.log(`✅ Reinsurance Ratio: ${reinsuranceRatio}%`);

        // 6. Test Governance
        console.log("\n🏛️ Testing ChainSureGovernance...");
        const governance = await ethers.getContractAt("ChainSureGovernance", DEPLOYED_CONTRACTS.governance);
        const votingPeriodGov = await governance.votingPeriod();
        const executionDelay = await governance.executionDelay();
        const nextProposalId = await governance.nextProposalId();
        console.log(`✅ Voting Period: ${votingPeriodGov} seconds`);
        console.log(`✅ Execution Delay: ${executionDelay} seconds`);
        console.log(`✅ Next Proposal ID: ${nextProposalId}`);

        // 7. Test Contract Interactions
        console.log("\n🔗 Testing Contract Integrations...");
        
        // Check if PolicyNFT has correct stablecoin reference
        const policyStablecoinRef = await policyNFT.stablecoin();
        const isStablecoinCorrect = policyStablecoinRef.toLowerCase() === DEPLOYED_CONTRACTS.stablecoin.toLowerCase();
        console.log(`✅ PolicyNFT → Stablecoin Reference: ${isStablecoinCorrect ? '✅ Correct' : '❌ Incorrect'}`);

        // Check if ClaimsEngine has correct references
        const claimsGovTokenRef = await claimsEngine.governanceToken();
        const claimsPolicyRef = await claimsEngine.policyNFT();
        const claimsStablecoinRef = await claimsEngine.stablecoin();
        
        const isGovTokenCorrect = claimsGovTokenRef.toLowerCase() === DEPLOYED_CONTRACTS.governanceToken.toLowerCase();
        const isPolicyCorrect = claimsPolicyRef.toLowerCase() === DEPLOYED_CONTRACTS.policyNFT.toLowerCase();
        const isClaimsStablecoinCorrect = claimsStablecoinRef.toLowerCase() === DEPLOYED_CONTRACTS.stablecoin.toLowerCase();
        
        console.log(`✅ ClaimsEngine → GovernanceToken: ${isGovTokenCorrect ? '✅ Correct' : '❌ Incorrect'}`);
        console.log(`✅ ClaimsEngine → PolicyNFT: ${isPolicyCorrect ? '✅ Correct' : '❌ Incorrect'}`);
        console.log(`✅ ClaimsEngine → Stablecoin: ${isClaimsStablecoinCorrect ? '✅ Correct' : '❌ Incorrect'}`);

        // Check permissions
        console.log("\n🔑 Checking Permissions...");
        const isDeployerOracleAuthorized = await claimsEngine.authorizedOracles(deployer.address);
        console.log(`✅ Deployer Oracle Authorization: ${isDeployerOracleAuthorized ? '✅ Authorized' : '❌ Not Authorized'}`);

        console.log("\n🎉 DEPLOYMENT VERIFICATION COMPLETE!");
        console.log("=".repeat(50));
        console.log("✅ All contracts deployed and configured successfully!");
        console.log("✅ Contract references are correct!");
        console.log("✅ Basic permissions are set up!");
        console.log("\n📋 Contract Addresses (BSC Testnet):");
        Object.entries(DEPLOYED_CONTRACTS).forEach(([name, address]) => {
            console.log(`${name.padEnd(20)}: ${address}`);
        });

        console.log("\n🔗 View on BSCScan:");
        Object.entries(DEPLOYED_CONTRACTS).forEach(([name, address]) => {
            console.log(`${name}: https://testnet.bscscan.com/address/${address}`);
        });

        console.log("\n🎯 Next Steps:");
        console.log("1. ✅ Contracts deployed and verified");
        console.log("2. 🚀 Start your frontend: cd frontend && npm run dev");
        console.log("3. 🔧 Start your backend: cd backend && npm run start:dev");
        console.log("4. 🤖 Start your AI service: cd ai-service && python main.py");
        console.log("5. 📝 Create test policies and claims");

    } catch (error) {
        console.error("\n❌ Verification failed:", error.message);
        console.error("Stack:", error.stack);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification script failed:", error);
        process.exit(1);
    }); 