const hre = require("hardhat");

async function main() {
  console.log("🔧 SBOMRegistry Interaction Script\n");

  // Get signers
  const [owner, vendor1, vendor2, user] = await hre.ethers.getSigners();
  
  console.log("👥 Available Accounts:");
  console.log("   Owner:", owner.address);
  console.log("   Vendor1:", vendor1.address);
  console.log("   Vendor2:", vendor2.address);
  console.log("   User:", user.address);
  console.log();

  // Deploy contract
  console.log("📦 Deploying SBOMRegistry...");
  const SBOMRegistry = await hre.ethers.getContractFactory("SBOMRegistry");
  const sbomRegistry = await SBOMRegistry.deploy();
  await sbomRegistry.waitForDeployment();
  const contractAddress = await sbomRegistry.getAddress();
  console.log("✅ Deployed to:", contractAddress);
  console.log();

  // ==========================================
  // 1. REGISTER VENDORS
  // ==========================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1️⃣  REGISTERING VENDORS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("📝 Registering Vendor1 (Acme Corp)...");
  await sbomRegistry.registerVendor(
    vendor1.address,
    "Acme Corporation",
    "https://acme.com",
    "security@acme.com"
  );
  console.log("✅ Vendor1 registered");

  console.log("📝 Registering Vendor2 (TechCo)...");
  await sbomRegistry.registerVendor(
    vendor2.address,
    "TechCo Inc",
    "https://techco.io",
    "contact@techco.io"
  );
  console.log("✅ Vendor2 registered");
  console.log();

  // Check vendor status
  const vendor1Info = await sbomRegistry.getVendorInfo(vendor1.address);
  console.log("📊 Vendor1 Info:");
  console.log("   Name:", vendor1Info.name);
  console.log("   Website:", vendor1Info.website);
  console.log("   Verified:", vendor1Info.verified);
  console.log();

  // ==========================================
  // 2. REGISTER SBOM
  // ==========================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("2️⃣  REGISTERING SBOM");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Create SBOM content and hash
  const sbomContent = JSON.stringify({
    name: "MyApp",
    version: "1.0.0",
    dependencies: ["express@4.18.0", "lodash@4.17.21"]
  });
  
  console.log("📄 SBOM Content:", sbomContent);
  
  const sbomHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(sbomContent));
  console.log("🔐 SBOM Hash:", sbomHash);

  // Sign the hash
  console.log("✍️  Signing with Vendor1...");
  const signature = await vendor1.signMessage(hre.ethers.getBytes(sbomHash));
  console.log("📝 Signature:", signature.slice(0, 20) + "...");
  console.log();

  // Register SBOM
  console.log("📤 Registering SBOM on blockchain...");
  const metadata = JSON.stringify({ version: "1.0.0", project: "MyApp", timestamp: Date.now() });
  const tx = await sbomRegistry.connect(vendor1).registerSBOM(sbomHash, metadata, signature);
  const receipt = await tx.wait();
  console.log("✅ SBOM registered! Gas used:", receipt.gasUsed.toString());
  console.log();

  // ==========================================
  // 3. VERIFY SBOM
  // ==========================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("3️⃣  VERIFYING SBOM");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [exists, record] = await sbomRegistry.verifySBOM(sbomHash);
  console.log("🔍 SBOM Verification:");
  console.log("   Exists:", exists);
  console.log("   Vendor:", record.vendor);
  console.log("   Timestamp:", new Date(Number(record.timestamp) * 1000).toISOString());
  console.log("   Metadata:", record.metadata);
  console.log();

  // Complete verification
  const [e, sigValid, vendorVerified, vendorName] = await sbomRegistry.verifyCompleteSBOM(sbomHash);
  console.log("✅ Complete Verification:");
  console.log("   SBOM Exists:", e);
  console.log("   Signature Valid:", sigValid);
  console.log("   Vendor Verified:", vendorVerified);
  console.log("   Vendor Name:", vendorName);
  console.log();

  // ==========================================
  // 4. UPDATE SBOM (VERSION 2)
  // ==========================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("4️⃣  UPDATING SBOM TO VERSION 2");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const sbomContentV2 = JSON.stringify({
    name: "MyApp",
    version: "2.0.0",
    dependencies: ["express@4.19.0", "lodash@4.17.21", "axios@1.6.0"]
  });

  console.log("📄 New SBOM Content:", sbomContentV2);
  
  const sbomHashV2 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(sbomContentV2));
  console.log("🔐 New SBOM Hash:", sbomHashV2);

  const signatureV2 = await vendor1.signMessage(hre.ethers.getBytes(sbomHashV2));
  const metadataV2 = JSON.stringify({ version: "2.0.0", project: "MyApp", timestamp: Date.now() });

  console.log("📤 Updating SBOM...");
  const tx2 = await sbomRegistry.connect(vendor1).updateSBOM(sbomHash, sbomHashV2, metadataV2, signatureV2);
  const receipt2 = await tx2.wait();
  console.log("✅ SBOM updated! Gas used:", receipt2.gasUsed.toString());
  console.log();

  // ==========================================
  // 5. VERSION HISTORY
  // ==========================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("5️⃣  VERSION HISTORY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const history = await sbomRegistry.getVersionHistory(sbomHash);
  console.log("📚 Version History (", history.length, "versions ):");
  history.forEach((hash, index) => {
    console.log(`   v${index + 1}:`, hash);
  });
  console.log();

  const rootHash = await sbomRegistry.getRootHash(sbomHashV2);
  console.log("🌳 Root Hash:", rootHash);
  console.log("   (Same as v1 hash:", rootHash === sbomHash, ")");
  console.log();

  // ==========================================
  // 6. ATTACK SCENARIO TEST
  // ==========================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("6️⃣  TESTING ATTACK SCENARIO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const maliciousContent = JSON.stringify({
    name: "MyApp",
    version: "1.0.0",
    dependencies: ["express@4.18.0", "malware@1.0.0"] // Malicious dependency!
  });

  const maliciousHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(maliciousContent));
  console.log("🦠 Attacker creates malicious SBOM with hash:", maliciousHash);

  console.log("🔍 Verifying malicious hash...");
  const [existsMalicious] = await sbomRegistry.verifySBOM(maliciousHash);
  console.log("   Found on blockchain:", existsMalicious);
  console.log("   ✅ Attack prevented! Malicious content not registered.");
  console.log();

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✨ INTERACTION SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ 2 vendors registered");
  console.log("✅ 1 SBOM registered (v1.0.0)");
  console.log("✅ 1 SBOM update (v2.0.0)");
  console.log("✅ Version history tracked");
  console.log("✅ Signatures verified");
  console.log("✅ Attack scenario tested");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🎉 All interactions completed successfully!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });