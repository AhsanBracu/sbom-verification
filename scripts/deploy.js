const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting SBOMRegistry deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy contract
  console.log("📦 Deploying SBOMRegistry contract...");
  const SBOMRegistry = await hre.ethers.getContractFactory("SBOMRegistry");
  const sbomRegistry = await SBOMRegistry.deploy();
  
  await sbomRegistry.waitForDeployment();
  const contractAddress = await sbomRegistry.getAddress();

  console.log("✅ SBOMRegistry deployed to:", contractAddress);
  console.log("👤 Registry owner:", await sbomRegistry.registryOwner());
  console.log("\n🎉 Deployment complete!\n");

  // Save deployment info
  console.log("📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Block Number:", await hre.ethers.provider.getBlockNumber());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  return sbomRegistry;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });