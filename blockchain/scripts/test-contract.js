const { ethers } = require("hardhat");

async function main() {
  console.log("Testing contract interaction...");
  
  const claimsEngineAddress = "0x54A4c8006272fDeA157950421ceBeb510387af83";
  
  // Get the contract factory
  const ClaimsEngine = await ethers.getContractFactory("ChainSureClaimsEngine");
  
  // Connect to the deployed contract
  const claimsEngine = ClaimsEngine.attach(claimsEngineAddress);
  
  console.log("Contract address:", claimsEngineAddress);
  
  // Test the submitClaim function signature
  try {
    // Try to encode the function call with 5 arguments
    const data = claimsEngine.interface.encodeFunctionData('submitClaim', [
      4, // policyId
      0, // claimType (enum)
      ethers.parseEther("45"), // requestedAmount
      "test description", // description
      ["QmEvidence1"] // evidenceHashes
    ]);
    console.log("✅ Function call encoded successfully with 5 arguments");
    console.log("Encoded data:", data);
  } catch (error) {
    console.log("❌ Error encoding function call with 5 arguments:", error.message);
  }
  
  // Try with 4 arguments to see what the contract expects
  try {
    const data = claimsEngine.interface.encodeFunctionData('submitClaim', [
      4, // policyId
      0, // claimType (enum)
      ethers.parseEther("45"), // requestedAmount
      "test description" // description only
    ]);
    console.log("✅ Function call encoded successfully with 4 arguments");
    console.log("Encoded data:", data);
  } catch (error) {
    console.log("❌ Error encoding function call with 4 arguments:", error.message);
  }
  
  // Check the contract's function signature
  console.log("\nContract function signatures:");
  const submitClaimFragment = claimsEngine.interface.getFunction('submitClaim');
  console.log("submitClaim function:", submitClaimFragment.format());
  console.log("Input types:", submitClaimFragment.inputs.map(input => input.type));
  console.log("Input names:", submitClaimFragment.inputs.map(input => input.name));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
