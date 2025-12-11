const { ethers } = require('hardhat');

/**
 * Register a vendor - Must be run by contract owner
 * 
 * Usage:
 *   npx hardhat run scripts/register-vendor.js --network localhost
 */
async function main() {
  console.log('\n🔐 Vendor Registration Script\n');

  // Get contract address from config
  const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update after deployment

  // Get signers
  const [owner] = await ethers.getSigners();
  console.log('📝 Contract Owner:', owner.address);

  // Connect to contract
  const SBOMRegistry = await ethers.getContractAt('SBOMRegistry', CONTRACT_ADDRESS);
  
  // Verify we're the owner
  const registryOwner = await SBOMRegistry.registryOwner();
  if (registryOwner.toLowerCase() !== owner.address.toLowerCase()) {
    console.error('❌ Error: You are not the contract owner!');
    console.log('   Contract owner:', registryOwner);
    console.log('   Your address:', owner.address);
    process.exit(1);
  }

  console.log('✅ Confirmed: You are the contract owner\n');

  // Vendor details - CUSTOMIZE THESE
  const vendorAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account #1
  const vendorName = "Acme Corporation";
  const vendorWebsite = "https://acme.com";
  const vendorEmail = "security@acme.com";

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Vendor Information');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Address:', vendorAddress);
  console.log('Name:', vendorName);
  console.log('Website:', vendorWebsite);
  console.log('Email:', vendorEmail);
  console.log();

  // Check if already registered
  const isVerified = await SBOMRegistry.isVerifiedVendor(vendorAddress);
  if (isVerified) {
    console.log('⚠️  Vendor is already registered!');
    
    const info = await SBOMRegistry.getVendorInfo(vendorAddress);
    console.log('\n📊 Current Vendor Info:');
    console.log('   Name:', info.name);
    console.log('   Website:', info.website);
    console.log('   Email:', info.contactEmail);
    console.log('   Verified:', info.verified);
    console.log('   Registered At:', new Date(Number(info.registeredAt) * 1000).toLocaleString());
    
    process.exit(0);
  }

  // Register vendor
  console.log('📤 Registering vendor...');
  const tx = await SBOMRegistry.registerVendor(
    vendorAddress,
    vendorName,
    vendorWebsite,
    vendorEmail
  );

  console.log('⏳ Transaction submitted:', tx.hash);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await tx.wait();

  console.log('\n✅ VENDOR REGISTERED SUCCESSFULLY!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Transaction Hash:', receipt.hash);
  console.log('Block Number:', receipt.blockNumber);
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verify registration
  const info = await SBOMRegistry.getVendorInfo(vendorAddress);
  console.log('\n📊 Verified Vendor Info:');
  console.log('   Name:', info.name);
  console.log('   Verified:', info.verified);
  console.log('   Registered At:', new Date(Number(info.registeredAt) * 1000).toLocaleString());

  console.log('\n💡 Next Steps:');
  console.log('   The vendor can now use the CLI to register SBOMs:');
  console.log('   sbom-cli register ./sbom.json --key VENDOR_PRIVATE_KEY');
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });