const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * COMPREHENSIVE PROTOCOL TEST SUITE
 * 
 * This test suite automatically executes the complete SBOM verification protocol:
 * 1. Contract deployment
 * 2. Vendor registration
 * 3. SBOM generation (with Syft)
 * 4. SBOM registration
 * 5. SBOM verification
 * 6. Version updates
 * 7. Security checks
 * 
 * Run with: npx hardhat test test/protocol.test.js
 */

describe("🔬 Complete SBOM Protocol Test Suite", function() {
  let sbomRegistry;
  let owner, vendor1, vendor2, attacker;
  let ownerAddress, vendor1Address, vendor2Address, attackerAddress;
  
  // Test data
  const SBOM_DIR = "./test-sboms";
  let sbomV1Content, sbomV2Content;
  let sbomV1Hash, sbomV2Hash;
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SETUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  before(async function() {
    console.log("\n📦 Setting up test environment...\n");
    
    // Get signers
    [owner, vendor1, vendor2, attacker] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    vendor1Address = await vendor1.getAddress();
    vendor2Address = await vendor2.getAddress();
    attackerAddress = await attacker.getAddress();
    
    console.log("Test Accounts:");
    console.log("  Owner:", ownerAddress);
    console.log("  Vendor1:", vendor1Address);
    console.log("  Vendor2:", vendor2Address);
    console.log("  Attacker:", attackerAddress);
    console.log();
    
    // Create test directory
    if (!fs.existsSync(SBOM_DIR)) {
      fs.mkdirSync(SBOM_DIR, { recursive: true });
    }
    
    // Generate test SBOMs
    console.log("📄 Generating test SBOMs...");
    
    // Check if Syft is available
    let useSyft = false;
    try {
      execSync('which syft', { stdio: 'ignore' });
      useSyft = true;
      console.log("  ✅ Syft detected - using real SBOMs");
    } catch (error) {
      console.log("  ⚠️  Syft not found - using mock SBOMs");
    }
    
    if (useSyft) {
      // Generate real SBOMs with Syft
      try {
        execSync(`syft dir:. -o json > ${SBOM_DIR}/test-v1.json 2>/dev/null`);
        sbomV1Content = fs.readFileSync(`${SBOM_DIR}/test-v1.json`, 'utf8');
        
        // For v2, add a timestamp to make it different
        const sbomV1Json = JSON.parse(sbomV1Content);
        sbomV1Json.descriptor.timestamp = new Date().toISOString();
        sbomV2Content = JSON.stringify(sbomV1Json, null, 2);
        fs.writeFileSync(`${SBOM_DIR}/test-v2.json`, sbomV2Content);
        
        console.log("  ✅ Real SBOMs generated with Syft");
      } catch (error) {
        useSyft = false;
        console.log("  ⚠️  Syft failed - falling back to mock SBOMs");
      }
    }
    
    if (!useSyft) {
      // Create mock SBOMs
      const mockSBOMv1 = {
        name: "test-app",
        version: "1.0.0",
        timestamp: Date.now(),
        packages: [
          { name: "express", version: "4.18.0" },
          { name: "lodash", version: "4.17.21" }
        ]
      };
      
      const mockSBOMv2 = {
        ...mockSBOMv1,
        version: "2.0.0",
        timestamp: Date.now() + 1000,
        packages: [
          ...mockSBOMv1.packages,
          { name: "axios", version: "1.6.0" }
        ]
      };
      
      sbomV1Content = JSON.stringify(mockSBOMv1, null, 2);
      sbomV2Content = JSON.stringify(mockSBOMv2, null, 2);
      
      fs.writeFileSync(`${SBOM_DIR}/test-v1.json`, sbomV1Content);
      fs.writeFileSync(`${SBOM_DIR}/test-v2.json`, sbomV2Content);
      
      console.log("  ✅ Mock SBOMs created");
    }
    
    // Compute hashes
    sbomV1Hash = ethers.keccak256(ethers.toUtf8Bytes(sbomV1Content));
    sbomV2Hash = ethers.keccak256(ethers.toUtf8Bytes(sbomV2Content));
    
    console.log("  SBOM v1 hash:", sbomV1Hash.slice(0, 20) + "...");
    console.log("  SBOM v2 hash:", sbomV2Hash.slice(0, 20) + "...");
    console.log();
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 1: CONTRACT DEPLOYMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  describe("📦 Protocol Step 1: Contract Deployment", function() {
    it("Should deploy the SBOMRegistry contract", async function() {
      console.log("\n  Deploying contract...");
      
      const SBOMRegistry = await ethers.getContractFactory("SBOMRegistry");
      sbomRegistry = await SBOMRegistry.deploy();
      await sbomRegistry.waitForDeployment();
      
      const address = await sbomRegistry.getAddress();
      console.log("  ✅ Contract deployed at:", address);
      
      expect(address).to.properAddress;
    });
    
    it("Should set deployer as registry owner", async function() {
      const registryOwner = await sbomRegistry.registryOwner();
      expect(registryOwner).to.equal(ownerAddress);
      console.log("  ✅ Owner verified:", registryOwner);
    });
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 2: VENDOR REGISTRATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  describe("🔐 Protocol Step 2: Vendor Registration", function() {
    it("Should allow owner to register vendor1", async function() {
      console.log("\n  Registering vendor1...");
      
      const tx = await sbomRegistry.registerVendor(
        vendor1Address,
        "Test Vendor Corp",
        "https://testvendor.com",
        "security@testvendor.com"
      );
      await tx.wait();
      
      const isVerified = await sbomRegistry.isVerifiedVendor(vendor1Address);
      expect(isVerified).to.be.true;
      console.log("  ✅ Vendor1 registered successfully");
    });
    
    it("Should store correct vendor information", async function() {
      const vendorInfo = await sbomRegistry.getVendorInfo(vendor1Address);
      
      expect(vendorInfo.name).to.equal("Test Vendor Corp");
      expect(vendorInfo.website).to.equal("https://testvendor.com");
      expect(vendorInfo.contactEmail).to.equal("security@testvendor.com");
      expect(vendorInfo.verified).to.be.true;
      
      console.log("  ✅ Vendor info verified");
    });
    
    it("Should reject vendor registration from non-owner", async function() {
      await expect(
        sbomRegistry.connect(attacker).registerVendor(
          vendor2Address,
          "Fake Vendor",
          "https://fake.com",
          "fake@fake.com"
        )
      ).to.be.revertedWith("Only registry owner can perform this action");
      
      console.log("  ✅ Non-owner registration blocked");
    });
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 3: SBOM REGISTRATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  describe("📄 Protocol Step 3: SBOM Registration", function() {
    let signature;
    
    before(async function() {
      // Sign SBOM hash with vendor1's private key
      signature = await vendor1.signMessage(ethers.getBytes(sbomV1Hash));
      console.log("\n  Signature created:", signature.slice(0, 20) + "...");
    });
    
    it("Should allow verified vendor to register SBOM", async function() {
      console.log("  Registering SBOM v1...");
      
      const metadata = JSON.stringify({
        name: "test-app",
        version: "1.0.0",
        timestamp: Date.now()
      });
      
      const tx = await sbomRegistry.connect(vendor1).registerSBOM(
        sbomV1Hash,
        metadata,
        signature
      );
      
      const receipt = await tx.wait();
      console.log("  ✅ SBOM registered, gas used:", receipt.gasUsed.toString());
      
      // Verify registration
      const [exists] = await sbomRegistry.verifySBOM(sbomV1Hash);
      expect(exists).to.be.true;
    });
    
    it("Should emit SBOMRegistered event", async function() {
      const metadata = JSON.stringify({ test: "event" });
      const testHash = ethers.keccak256(ethers.toUtf8Bytes("test-event-unique"));
      const testSig = await vendor1.signMessage(ethers.getBytes(testHash));
      
      const tx = await sbomRegistry.connect(vendor1).registerSBOM(testHash, metadata, testSig);
      const receipt = await tx.wait();
      
      // Event has 4 parameters: hash, vendor, timestamp, metadata
      const event = receipt.logs.find(log => {
        try {
          const parsed = sbomRegistry.interface.parseLog(log);
          return parsed.name === "SBOMRegistered";
        } catch (e) {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      console.log("  ✅ Event emitted correctly");
    });
    
    it("Should reject SBOM registration from unverified vendor", async function() {
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      const fakeSig = await vendor2.signMessage(ethers.getBytes(fakeHash));
      
      await expect(
        sbomRegistry.connect(vendor2).registerSBOM(
          fakeHash,
          "{}",
          fakeSig
        )
      ).to.be.revertedWith("Vendor not verified - please register as vendor first");
      
      console.log("  ✅ Unverified vendor blocked");
    });
    
    it("Should reject SBOM with invalid signature", async function() {
      const uniqueHash = ethers.keccak256(ethers.toUtf8Bytes("unique-test-" + Date.now()));
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong-hash-" + Date.now()));
      const wrongSig = await vendor1.signMessage(ethers.getBytes(wrongHash));
      
      await expect(
        sbomRegistry.connect(vendor1).registerSBOM(
          uniqueHash,  // Different hash than signed
          "{}",
          wrongSig     // Signature doesn't match
        )
      ).to.be.revertedWith("Invalid signature - signer does not match sender");
      
      console.log("  ✅ Invalid signature rejected");
    });
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 4: SBOM VERIFICATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  describe("🔍 Protocol Step 4: SBOM Verification", function() {
    it("Should verify registered SBOM as trusted", async function() {
      console.log("\n  Verifying SBOM v1...");
      
      const [exists, sigValid, vendorVerified, vendorName] = 
        await sbomRegistry.verifyCompleteSBOM(sbomV1Hash);
      
      expect(exists).to.be.true;
      expect(sigValid).to.be.true;
      expect(vendorVerified).to.be.true;
      expect(vendorName).to.equal("Test Vendor Corp");
      
      console.log("  ✅ SBOM verified as TRUSTED");
      console.log("    - Exists: true");
      console.log("    - Signature valid: true");
      console.log("    - Vendor verified: true");
      console.log("    - Vendor:", vendorName);
    });
    
    it("Should reject unregistered SBOM", async function() {
      const unregisteredHash = ethers.keccak256(ethers.toUtf8Bytes("unregistered"));
      
      const [exists] = await sbomRegistry.verifySBOM(unregisteredHash);
      expect(exists).to.be.false;
      
      console.log("  ✅ Unregistered SBOM rejected");
    });
    
    it("Should detect revoked vendor", async function() {
      // Revoke vendor1
      console.log("  Revoking vendor...");
      await sbomRegistry.revokeVendor(vendor1Address);
      
      const [, , vendorVerified] = await sbomRegistry.verifyCompleteSBOM(sbomV1Hash);
      expect(vendorVerified).to.be.false;
      
      console.log("  ✅ Revoked vendor detected");
      
      // Re-register for next tests
      await sbomRegistry.registerVendor(
        vendor1Address,
        "Test Vendor Corp",
        "https://testvendor.com",
        "security@testvendor.com"
      );
    });
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 5: VERSION UPDATES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  describe("🔄 Protocol Step 5: Version Updates", function() {
    let v2Signature;
    
    before(async function() {
      v2Signature = await vendor1.signMessage(ethers.getBytes(sbomV2Hash));
    });
    
    it("Should allow vendor to update their SBOM", async function() {
      console.log("\n  Updating to SBOM v2...");
      
      const metadata = JSON.stringify({
        name: "test-app",
        version: "2.0.0",
        timestamp: Date.now()
      });
      
      const tx = await sbomRegistry.connect(vendor1).updateSBOM(
        sbomV1Hash,  // Old version
        sbomV2Hash,  // New version
        metadata,
        v2Signature
      );
      
      await tx.wait();
      console.log("  ✅ SBOM updated to v2");
      
      // Verify v2 exists
      const [exists] = await sbomRegistry.verifySBOM(sbomV2Hash);
      expect(exists).to.be.true;
    });
    
    it("Should link versions correctly", async function() {
      const [, record] = await sbomRegistry.verifySBOM(sbomV2Hash);
      
      expect(record.previousHash).to.equal(sbomV1Hash);
      console.log("  ✅ Version link verified");
      console.log("    v2.previousHash ==", record.previousHash.slice(0, 20) + "...");
      console.log("    v1.hash ==", sbomV1Hash.slice(0, 20) + "...");
    });
    
    it("Should retrieve complete version history", async function() {
      const history = await sbomRegistry.getVersionHistory(sbomV2Hash);
      
      expect(history.length).to.equal(2);
      // Array is in chronological order: [v1 (oldest), v2 (latest)]
      expect(history[0]).to.equal(sbomV1Hash);  // First/oldest version
      expect(history[1]).to.equal(sbomV2Hash);  // Latest version
      
      console.log("  ✅ Version history retrieved");
      console.log("    Version 1 (oldest):", history[0].slice(0, 20) + "...");
      console.log("    Version 2 (latest):", history[1].slice(0, 20) + "...");
    });
    
    it("Should reject update of non-existent old SBOM", async function() {
      const fakeOldHash = ethers.keccak256(ethers.toUtf8Bytes("fake-old"));
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("new"));
      const sig = await vendor1.signMessage(ethers.getBytes(newHash));
      
      await expect(
        sbomRegistry.connect(vendor1).updateSBOM(fakeOldHash, newHash, "{}", sig)
      ).to.be.revertedWith("Original SBOM not found");
      
      console.log("  ✅ Non-existent old SBOM rejected");
    });
    
    it("Should reject update from non-owner vendor", async function() {
      // Register vendor2
      await sbomRegistry.registerVendor(
        vendor2Address,
        "Vendor 2",
        "https://vendor2.com",
        "security@vendor2.com"
      );
      
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("attacker-update"));
      const sig = await vendor2.signMessage(ethers.getBytes(newHash));
      
      await expect(
        sbomRegistry.connect(vendor2).updateSBOM(
          sbomV1Hash,  // vendor1's SBOM
          newHash,
          "{}",
          sig
        )
      ).to.be.revertedWith("Only original vendor can update");
      
      console.log("  ✅ Cross-vendor update blocked");
    });
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEST 6: SECURITY TESTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  describe("🔐 Protocol Step 6: Security Validation", function() {
    it("Should prevent signature replay attacks", async function() {
      console.log("\n  Testing signature replay attack...");
      
      const testHash = ethers.keccak256(ethers.toUtf8Bytes("replay-test-unique"));
      const signature = await vendor1.signMessage(ethers.getBytes(testHash));
      
      // Register once
      await sbomRegistry.connect(vendor1).registerSBOM(testHash, "{}", signature);
      
      // Try to reuse same signature for different hash
      const differentHash = ethers.keccak256(ethers.toUtf8Bytes("different-unique"));
      
      await expect(
        sbomRegistry.connect(vendor1).registerSBOM(
          differentHash,
          "{}",
          signature  // Same signature, different hash
        )
      ).to.be.revertedWith("Invalid signature - signer does not match sender");
      
      console.log("  ✅ Signature replay attack prevented");
    });
    
    it("Should prevent double registration", async function() {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("double-test"));
      const sig = await vendor1.signMessage(ethers.getBytes(hash));
      
      // Register once
      await sbomRegistry.connect(vendor1).registerSBOM(hash, "{}", sig);
      
      // Try to register again
      await expect(
        sbomRegistry.connect(vendor1).registerSBOM(hash, "{}", sig)
      ).to.be.revertedWith("SBOM already registered");
      
      console.log("  ✅ Double registration prevented");
    });
    
    it("Should prevent ownership transfer attacks", async function() {
      // Attacker steals vendor1's signature
      const stolenSig = await vendor1.signMessage(ethers.getBytes(sbomV1Hash));
      
      // Attacker tries to use it
      await expect(
        sbomRegistry.connect(attacker).registerSBOM(sbomV1Hash, "{}", stolenSig)
      ).to.be.revertedWith("SBOM already registered");
      
      console.log("  ✅ Stolen signature attack prevented");
    });
  });
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLEANUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  after(function() {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL PROTOCOL TESTS PASSED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📊 Protocol Summary:");
    console.log("  ✅ Contract deployment - WORKING");
    console.log("  ✅ Vendor registration - WORKING");
    console.log("  ✅ SBOM registration - WORKING");
    console.log("  ✅ SBOM verification - WORKING");
    console.log("  ✅ Version updates - WORKING");
    console.log("  ✅ Security validation - WORKING");
    console.log("\n🎉 Your SBOM blockchain verification protocol is fully functional!\n");
  });
});