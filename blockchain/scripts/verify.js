const { ethers, run } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🔍 Starting contract verification on BSCScan...");

    // Get network name
    const network = await ethers.provider.getNetwork();
    const networkName = network.name;
    
    console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

    // Load deployment information
    const deploymentPath = path.join(__dirname, '..', 'deployments', `${networkName}.json`);
    
    if (!fs.existsSync(deploymentPath)) {
        console.error(`❌ Deployment file not found: ${deploymentPath}`);
        console.log("Please run deployment script first.");
        process.exit(1);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log(`📄 Loaded deployment info from: ${deploymentPath}`);

    // Verify each contract
    const contracts = [
        'stablecoin',
        'governanceToken', 
        'policyNFT',
        'claimsEngine',
        'surplusDistributor',
        'governance'
    ];

    console.log(`\n🔍 Verifying ${contracts.length} contracts...\n`);

    for (const contractKey of contracts) {
        const contractInfo = deploymentInfo.contracts[contractKey];
        
        if (!contractInfo) {
            console.log(`⚠️ Contract info not found for: ${contractKey}`);
            continue;
        }

        console.log(`🔍 Verifying ${contractInfo.name}...`);
        console.log(`   Address: ${contractInfo.address}`);
        console.log(`   Args: ${contractInfo.args.join(', ')}`);

        try {
            await run("verify:verify", {
                address: contractInfo.address,
                constructorArguments: contractInfo.args,
            });
            
            console.log(`✅ ${contractInfo.name} verified successfully!`);
            
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log(`✅ ${contractInfo.name} already verified!`);
            } else {
                console.error(`❌ Failed to verify ${contractInfo.name}:`, error.message);
            }
        }
        
        console.log(); // Empty line for readability
    }

    console.log("🎉 Verification process completed!");
    console.log("\n📋 Summary:");
    console.log("===========");
    
    contracts.forEach(contractKey => {
        const contractInfo = deploymentInfo.contracts[contractKey];
        if (contractInfo) {
            const explorerUrl = network.chainId === 97 
                ? `https://testnet.bscscan.com/address/${contractInfo.address}`
                : `https://bscscan.com/address/${contractInfo.address}`;
            
            console.log(`${contractInfo.name}: ${explorerUrl}`);
        }
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    }); 