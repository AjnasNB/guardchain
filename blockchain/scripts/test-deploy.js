const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Starting test deployment on local network...");

    // Get test accounts
    const [deployer, alice, bob, charlie] = await ethers.getSigners();
    
    console.log("👥 Test accounts:");
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Alice: ${alice.address}`);
    console.log(`Bob: ${bob.address}`);
    console.log(`Charlie: ${charlie.address}`);

    // Configuration for testing
    const INITIAL_STABLECOIN_SUPPLY = ethers.utils.parseEther("1000000");
    const INITIAL_GOVERNANCE_SUPPLY = ethers.utils.parseEther("100000");
    const INR_PEG_RATE = ethers.utils.parseEther("0.012");

    // Deploy contracts
    console.log("\n📄 Deploying test contracts...");

    // 1. Stablecoin
    const ChainSureStablecoin = await ethers.getContractFactory("ChainSureStablecoin");
    const stablecoin = await ChainSureStablecoin.deploy(
        "0x0000000000000000000000000000000000000000",
        INR_PEG_RATE
    );
    await stablecoin.deployed();
    console.log("✅ Stablecoin deployed:", stablecoin.address);

    // 2. Governance Token
    const ChainSureGovernanceToken = await ethers.getContractFactory("ChainSureGovernanceToken");
    const governanceToken = await ChainSureGovernanceToken.deploy(INITIAL_GOVERNANCE_SUPPLY);
    await governanceToken.deployed();
    console.log("✅ Governance Token deployed:", governanceToken.address);

    // 3. Policy NFT
    const ChainSurePolicyNFT = await ethers.getContractFactory("ChainSurePolicyNFT");
    const policyNFT = await ChainSurePolicyNFT.deploy(stablecoin.address, deployer.address);
    await policyNFT.deployed();
    console.log("✅ Policy NFT deployed:", policyNFT.address);

    // 4. Claims Engine
    const ChainSureClaimsEngine = await ethers.getContractFactory("ChainSureClaimsEngine");
    const claimsEngine = await ChainSureClaimsEngine.deploy(
        policyNFT.address,
        governanceToken.address,
        stablecoin.address,
        alice.address // Alice as AI service for testing
    );
    await claimsEngine.deployed();
    console.log("✅ Claims Engine deployed:", claimsEngine.address);

    // 5. Surplus Distributor
    const ChainSureSurplusDistributor = await ethers.getContractFactory("ChainSureSurplusDistributor");
    const surplusDistributor = await ChainSureSurplusDistributor.deploy(
        stablecoin.address,
        governanceToken.address,
        policyNFT.address,
        bob.address // Bob as reinsurance provider for testing
    );
    await surplusDistributor.deployed();
    console.log("✅ Surplus Distributor deployed:", surplusDistributor.address);

    // 6. Governance
    const ChainSureGovernance = await ethers.getContractFactory("ChainSureGovernance");
    const governance = await ChainSureGovernance.deploy(
        governanceToken.address,
        policyNFT.address,
        claimsEngine.address,
        surplusDistributor.address,
        charlie.address // Charlie as guardian for testing
    );
    await governance.deployed();
    console.log("✅ Governance deployed:", governance.address);

    // Setup permissions
    console.log("\n⚙️ Setting up test permissions...");
    
    await stablecoin.addMinter(policyNFT.address, ethers.utils.parseEther("100000"));
    await stablecoin.addMinter(claimsEngine.address, ethers.utils.parseEther("50000"));
    await claimsEngine.addAuthorizedOracle(deployer.address);
    await claimsEngine.addAuthorizedOracle(alice.address);

    console.log("✅ Permissions configured");

    // Test basic functionality
    console.log("\n🧪 Running basic functionality tests...");

    try {
        // Test 1: Create a policy
        console.log("🔬 Test 1: Creating a policy...");
        
        // First, mint some stablecoins to Alice for premium payment
        await stablecoin.mint(alice.address, ethers.utils.parseEther("10000"), "Test mint");
        
        // Alice approves PolicyNFT to spend her stablecoins
        await stablecoin.connect(alice).approve(policyNFT.address, ethers.utils.parseEther("1000"));
        
        // Create a health insurance policy
        const policyTx = await policyNFT.connect(alice).createPolicy(
            alice.address,
            0, // PolicyType.Health
            ethers.utils.parseEther("50000"), // 50K coverage
            alice.address, // Beneficiary
            "Test health insurance policy",
            ethers.utils.formatBytes32String("test-ipfs-hash"),
            0 // Use default term length
        );
        
        const policyReceipt = await policyTx.wait();
        const policyId = policyReceipt.events[0].args.tokenId;
        
        console.log(`✅ Policy created with ID: ${policyId}`);

        // Test 2: Submit a claim
        console.log("🔬 Test 2: Submitting a claim...");
        
        const claimTx = await claimsEngine.connect(alice).submitClaim(
            policyId,
            0, // ClaimType.Health
            ethers.utils.parseEther("5000"), // 5K claim
            "Medical emergency claim",
            ["ipfs-hash-1", "ipfs-hash-2"]
        );
        
        const claimReceipt = await claimTx.wait();
        const claimId = claimReceipt.events[0].args.claimId;
        
        console.log(`✅ Claim submitted with ID: ${claimId}`);

        // Test 3: Stake governance tokens for jury participation
        console.log("🔬 Test 3: Staking governance tokens...");
        
        // Transfer some governance tokens to Bob
        await governanceToken.transfer(bob.address, ethers.utils.parseEther("5000"));
        
        // Bob stakes tokens to join jury pool
        await governanceToken.connect(bob).stakeTokens(
            ethers.utils.parseEther("2000"),
            30 * 24 * 60 * 60, // 30 days
            true // For jury participation
        );
        
        console.log("✅ Tokens staked for jury participation");

        // Test 4: Distribute governance tokens for voting
        console.log("🔬 Test 4: Distributing governance tokens...");
        
        await governanceToken.transfer(alice.address, ethers.utils.parseEther("10000"));
        await governanceToken.transfer(charlie.address, ethers.utils.parseEther("10000"));
        
        console.log("✅ Governance tokens distributed");

        console.log("\n🎉 All basic tests passed!");

    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }

    // Display test summary
    console.log("\n📊 Test Deployment Summary:");
    console.log("===========================");
    console.log(`Network: Local Hardhat Network`);
    console.log(`\n📄 Contract Addresses:`);
    console.log(`ChainSureStablecoin: ${stablecoin.address}`);
    console.log(`ChainSureGovernanceToken: ${governanceToken.address}`);
    console.log(`ChainSurePolicyNFT: ${policyNFT.address}`);
    console.log(`ChainSureClaimsEngine: ${claimsEngine.address}`);
    console.log(`ChainSureSurplusDistributor: ${surplusDistributor.address}`);
    console.log(`ChainSureGovernance: ${governance.address}`);

    console.log(`\n👥 Test Actors:`);
    console.log(`Deployer/Platform Admin: ${deployer.address}`);
    console.log(`Alice (Policyholder/AI Service): ${alice.address}`);
    console.log(`Bob (Juror/Reinsurer): ${bob.address}`);
    console.log(`Charlie (Guardian): ${charlie.address}`);

    console.log(`\n💰 Token Balances:`);
    console.log(`Alice csINR: ${ethers.utils.formatEther(await stablecoin.balanceOf(alice.address))}`);
    console.log(`Alice CSURE: ${ethers.utils.formatEther(await governanceToken.balanceOf(alice.address))}`);
    console.log(`Bob CSURE: ${ethers.utils.formatEther(await governanceToken.balanceOf(bob.address))}`);
    console.log(`Charlie CSURE: ${ethers.utils.formatEther(await governanceToken.balanceOf(charlie.address))}`);

    return {
        stablecoin: stablecoin.address,
        governanceToken: governanceToken.address,
        policyNFT: policyNFT.address,
        claimsEngine: claimsEngine.address,
        surplusDistributor: surplusDistributor.address,
        governance: governance.address,
        testAccounts: {
            deployer: deployer.address,
            alice: alice.address,
            bob: bob.address,
            charlie: charlie.address
        }
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test deployment failed:", error);
        process.exit(1);
    }); 