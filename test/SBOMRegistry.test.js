const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SBOMRegistry", function () {
  let sbomRegistry;
  let owner;
  let vendor1;
  let vendor2;
  let user1;
  let attacker;

  function createHash(content) {
    return ethers.keccak256(ethers.toUtf8Bytes(content));
  }

  async function signHash(hash, signer) {
    return await signer.signMessage(ethers.getBytes(hash));
  }

  beforeEach(async function () {
    [owner, vendor1, vendor2, user1, attacker] = await ethers.getSigners();
    
    const SBOMRegistry = await ethers.getContractFactory("SBOMRegistry");
    sbomRegistry = await SBOMRegistry.deploy();
    await sbomRegistry.waitForDeployment();
  });

  // ==========================================
  // DEPLOYMENT TESTS
  // ==========================================
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await sbomRegistry.registryOwner()).to.equal(owner.address);
    });
  });

  // ==========================================
  // VENDOR REGISTRY TESTS
  // ==========================================
  describe("Vendor Registry", function () {
    describe("registerVendor", function () {
      it("Should register a new vendor", async function () {
        await sbomRegistry.registerVendor(
          vendor1.address,
          "Acme Corp",
          "https://acme.com",
          "security@acme.com"
        );

        const vendorInfo = await sbomRegistry.getVendorInfo(vendor1.address);
        expect(vendorInfo.name).to.equal("Acme Corp");
        expect(vendorInfo.website).to.equal("https://acme.com");
        expect(vendorInfo.contactEmail).to.equal("security@acme.com");
        expect(vendorInfo.verified).to.be.true;
      });

      it("Should emit VendorRegistered event", async function () {
        await expect(
          sbomRegistry.registerVendor(
            vendor1.address,
            "Acme Corp",
            "https://acme.com",
            "security@acme.com"
          )
        ).to.emit(sbomRegistry, "VendorRegistered");
      });

      it("Should not allow non-owner to register vendor", async function () {
        await expect(
          sbomRegistry.connect(vendor1).registerVendor(
            vendor2.address,
            "Test Corp",
            "https://test.com",
            "test@test.com"
          )
        ).to.be.revertedWith("Only registry owner can perform this action");
      });

      it("Should prevent duplicate vendor registration", async function () {
        await sbomRegistry.registerVendor(
          vendor1.address,
          "Acme Corp",
          "https://acme.com",
          "security@acme.com"
        );

        await expect(
          sbomRegistry.registerVendor(
            vendor1.address,
            "Duplicate",
            "https://dup.com",
            "dup@dup.com"
          )
        ).to.be.revertedWith("Vendor already registered");
      });

      it("Should reject zero address", async function () {
        await expect(
          sbomRegistry.registerVendor(
            ethers.ZeroAddress,
            "Zero Corp",
            "https://zero.com",
            "zero@zero.com"
          )
        ).to.be.revertedWith("Invalid vendor address");
      });

      it("Should reject empty name", async function () {
        await expect(
          sbomRegistry.registerVendor(
            vendor1.address,
            "",
            "https://test.com",
            "test@test.com"
          )
        ).to.be.revertedWith("Name cannot be empty");
      });
    });

    describe("isVerifiedVendor", function () {
      it("Should return true for verified vendor", async function () {
        await sbomRegistry.registerVendor(
          vendor1.address,
          "Acme Corp",
          "https://acme.com",
          "security@acme.com"
        );
        expect(await sbomRegistry.isVerifiedVendor(vendor1.address)).to.be.true;
      });

      it("Should return false for unverified vendor", async function () {
        expect(await sbomRegistry.isVerifiedVendor(vendor1.address)).to.be.false;
      });
    });

    describe("revokeVendor", function () {
      beforeEach(async function () {
        await sbomRegistry.registerVendor(
          vendor1.address,
          "Acme Corp",
          "https://acme.com",
          "security@acme.com"
        );
      });

      it("Should revoke vendor", async function () {
        await sbomRegistry.revokeVendor(vendor1.address);
        expect(await sbomRegistry.isVerifiedVendor(vendor1.address)).to.be.false;
      });

      it("Should emit VendorRevoked event", async function () {
        await expect(sbomRegistry.revokeVendor(vendor1.address))
          .to.emit(sbomRegistry, "VendorRevoked");
      });

      it("Should not allow non-owner to revoke", async function () {
        await expect(
          sbomRegistry.connect(vendor1).revokeVendor(vendor1.address)
        ).to.be.revertedWith("Only registry owner can perform this action");
      });

      it("Should not allow revoking non-verified vendor", async function () {
        await expect(
          sbomRegistry.revokeVendor(vendor2.address)
        ).to.be.revertedWith("Vendor not verified");
      });
    });

    describe("transferOwnership", function () {
      it("Should transfer ownership", async function () {
        await sbomRegistry.transferOwnership(vendor1.address);
        expect(await sbomRegistry.registryOwner()).to.equal(vendor1.address);
      });

      it("Should not allow non-owner to transfer", async function () {
        await expect(
          sbomRegistry.connect(vendor1).transferOwnership(vendor2.address)
        ).to.be.revertedWith("Only registry owner can perform this action");
      });

      it("Should reject zero address", async function () {
        await expect(
          sbomRegistry.transferOwnership(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid new owner address");
      });
    });
  });

  // ==========================================
  // SBOM REGISTRATION TESTS
  // ==========================================
  describe("SBOM Registration", function () {
    beforeEach(async function () {
      await sbomRegistry.registerVendor(
        vendor1.address,
        "Acme Corp",
        "https://acme.com",
        "security@acme.com"
      );
    });

    describe("registerSBOM", function () {
      it("Should register new SBOM with valid signature", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);

        const [exists, record] = await sbomRegistry.verifySBOM(hash);
        expect(exists).to.be.true;
        expect(record.vendor).to.equal(vendor1.address);
        expect(record.metadata).to.equal("v1.0");
        expect(record.previousHash).to.equal(ethers.ZeroHash);
      });

      it("Should emit SBOMRegistered event", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor1);

        await expect(
          sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature)
        ).to.emit(sbomRegistry, "SBOMRegistered");
      });

      it("Should initialize version history", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);

        const history = await sbomRegistry.getVersionHistory(hash);
        expect(history.length).to.equal(1);
        expect(history[0]).to.equal(hash);
      });

      it("Should set root hash correctly", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);

        const root = await sbomRegistry.getRootHash(hash);
        expect(root).to.equal(hash);
      });

      it("Should reject mismatched signature", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor2);

        await expect(
          sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature)
        ).to.be.revertedWith("Invalid signature - signer does not match sender");
      });

      it("Should block unverified vendor", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor2);

        await expect(
          sbomRegistry.connect(vendor2).registerSBOM(hash, "v1.0", signature)
        ).to.be.revertedWith("Vendor not verified - please register as vendor first");
      });

      it("Should prevent duplicate registration", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);

        await expect(
          sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature)
        ).to.be.revertedWith("SBOM already registered");
      });

      it("Should store signature correctly", async function () {
        const hash = createHash("sbom-v1");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);

        const [, record] = await sbomRegistry.verifySBOM(hash);
        expect(record.signature).to.equal(signature);
      });
    });

    describe("updateSBOM", function () {
      let hash1;

      beforeEach(async function () {
        hash1 = createHash("sbom-v1");
        const sig1 = await signHash(hash1, vendor1);
        await sbomRegistry.connect(vendor1).registerSBOM(hash1, "v1.0", sig1);
      });

      it("Should update SBOM version", async function () {
        const hash2 = createHash("sbom-v2");
        const sig2 = await signHash(hash2, vendor1);

        await sbomRegistry.connect(vendor1).updateSBOM(hash1, hash2, "v2.0", sig2);

        const [exists, record] = await sbomRegistry.verifySBOM(hash2);
        expect(exists).to.be.true;
        expect(record.previousHash).to.equal(hash1);
        expect(record.metadata).to.equal("v2.0");
      });

      it("Should emit SBOMUpdated event", async function () {
        const hash2 = createHash("sbom-v2");
        const sig2 = await signHash(hash2, vendor1);

        await expect(
          sbomRegistry.connect(vendor1).updateSBOM(hash1, hash2, "v2.0", sig2)
        ).to.emit(sbomRegistry, "SBOMUpdated");
      });

      it("Should maintain complete version history", async function () {
        const hash2 = createHash("sbom-v2");
        const hash3 = createHash("sbom-v3");

        const sig2 = await signHash(hash2, vendor1);
        const sig3 = await signHash(hash3, vendor1);

        await sbomRegistry.connect(vendor1).updateSBOM(hash1, hash2, "v2.0", sig2);
        await sbomRegistry.connect(vendor1).updateSBOM(hash2, hash3, "v3.0", sig3);

        const history = await sbomRegistry.getVersionHistory(hash1);
        expect(history.length).to.equal(3);
        expect(history[0]).to.equal(hash1);
        expect(history[1]).to.equal(hash2);
        expect(history[2]).to.equal(hash3);
      });

      it("Should link all versions to same root", async function () {
        const hash2 = createHash("sbom-v2");
        const hash3 = createHash("sbom-v3");

        const sig2 = await signHash(hash2, vendor1);
        const sig3 = await signHash(hash3, vendor1);

        await sbomRegistry.connect(vendor1).updateSBOM(hash1, hash2, "v2.0", sig2);
        await sbomRegistry.connect(vendor1).updateSBOM(hash2, hash3, "v3.0", sig3);

        const root1 = await sbomRegistry.getRootHash(hash1);
        const root2 = await sbomRegistry.getRootHash(hash2);
        const root3 = await sbomRegistry.getRootHash(hash3);

        expect(root1).to.equal(hash1);
        expect(root2).to.equal(hash1);
        expect(root3).to.equal(hash1);
      });

      it("Should not allow non-vendor to update", async function () {
        await sbomRegistry.registerVendor(
          vendor2.address,
          "Test Corp",
          "https://test.com",
          "test@test.com"
        );

        const hash2 = createHash("sbom-v2");
        const sig2 = await signHash(hash2, vendor2);

        await expect(
          sbomRegistry.connect(vendor2).updateSBOM(hash1, hash2, "v2.0", sig2)
        ).to.be.revertedWith("Only original vendor can update");
      });

      it("Should not allow updating non-existent SBOM", async function () {
        const nonExistent = createHash("non-existent");
        const hash2 = createHash("sbom-v2");
        const sig2 = await signHash(hash2, vendor1);

        await expect(
          sbomRegistry.connect(vendor1).updateSBOM(nonExistent, hash2, "v2.0", sig2)
        ).to.be.revertedWith("Original SBOM not found");
      });
    });
  });

  // ==========================================
  // SIGNATURE VERIFICATION TESTS
  // ==========================================
  describe("Signature Verification", function () {
    beforeEach(async function () {
      await sbomRegistry.registerVendor(
        vendor1.address,
        "Acme Corp",
        "https://acme.com",
        "security@acme.com"
      );
    });

    describe("recoverSigner", function () {
      it("Should recover correct signer address", async function () {
        const hash = createHash("test-message");
        const signature = await signHash(hash, vendor1);

        const recovered = await sbomRegistry.recoverSigner(hash, signature);
        expect(recovered).to.equal(vendor1.address);
      });
    });

    describe("verifySignature", function () {
      it("Should return true for valid signature", async function () {
        const hash = createHash("test-sbom");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);

        const [isValid, signer] = await sbomRegistry.verifySignature(hash);
        expect(isValid).to.be.true;
        expect(signer).to.equal(vendor1.address);
      });

      it("Should return false for non-existent SBOM", async function () {
        const hash = createHash("non-existent");

        const [isValid, signer] = await sbomRegistry.verifySignature(hash);
        expect(isValid).to.be.false;
        expect(signer).to.equal(ethers.ZeroAddress);
      });
    });

    describe("verifyCompleteSBOM", function () {
      it("Should return complete verification info", async function () {
        const hash = createHash("test-sbom");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);

        const [exists, sigValid, vendorVerified, vendorName] =
          await sbomRegistry.verifyCompleteSBOM(hash);

        expect(exists).to.be.true;
        expect(sigValid).to.be.true;
        expect(vendorVerified).to.be.true;
        expect(vendorName).to.equal("Acme Corp");
      });

      it("Should return false for non-existent SBOM", async function () {
        const hash = createHash("non-existent");

        const [exists, sigValid, vendorVerified, vendorName] =
          await sbomRegistry.verifyCompleteSBOM(hash);

        expect(exists).to.be.false;
        expect(sigValid).to.be.false;
        expect(vendorVerified).to.be.false;
        expect(vendorName).to.equal("");
      });

      it("Should show vendor not verified after revocation", async function () {
        const hash = createHash("test-sbom");
        const signature = await signHash(hash, vendor1);

        await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);
        await sbomRegistry.revokeVendor(vendor1.address);

        const [exists, sigValid, vendorVerified, vendorName] =
          await sbomRegistry.verifyCompleteSBOM(hash);

        expect(exists).to.be.true;
        expect(sigValid).to.be.true;
        expect(vendorVerified).to.be.false;
        expect(vendorName).to.equal("Acme Corp");
      });
    });
  });

  // ==========================================
  // VERSION HISTORY TESTS
  // ==========================================
  describe("Version History", function () {
    beforeEach(async function () {
      await sbomRegistry.registerVendor(
        vendor1.address,
        "Acme Corp",
        "https://acme.com",
        "security@acme.com"
      );
    });

    it("Should return correct version count", async function () {
      const hash1 = createHash("sbom-v1");
      const hash2 = createHash("sbom-v2");
      const hash3 = createHash("sbom-v3");

      const sig1 = await signHash(hash1, vendor1);
      const sig2 = await signHash(hash2, vendor1);
      const sig3 = await signHash(hash3, vendor1);

      await sbomRegistry.connect(vendor1).registerSBOM(hash1, "v1.0", sig1);
      expect(await sbomRegistry.getVersionCount(hash1)).to.equal(1);

      await sbomRegistry.connect(vendor1).updateSBOM(hash1, hash2, "v2.0", sig2);
      expect(await sbomRegistry.getVersionCount(hash1)).to.equal(2);
      expect(await sbomRegistry.getVersionCount(hash2)).to.equal(2);

      await sbomRegistry.connect(vendor1).updateSBOM(hash2, hash3, "v3.0", sig3);
      expect(await sbomRegistry.getVersionCount(hash1)).to.equal(3);
      expect(await sbomRegistry.getVersionCount(hash2)).to.equal(3);
      expect(await sbomRegistry.getVersionCount(hash3)).to.equal(3);
    });
  });

  // ==========================================
  // ATTACK SCENARIO TESTS
  // ==========================================
  describe("Attack Scenarios", function () {
    beforeEach(async function () {
      await sbomRegistry.registerVendor(
        vendor1.address,
        "Acme Corp",
        "https://acme.com",
        "security@acme.com"
      );
    });

    it("Should prevent attacker from using stolen signature", async function () {
      const hash = createHash("test-sbom");
      const signature = await signHash(hash, vendor1);

      // Contract checks signature first, so it will fail with "Invalid signature"
      await expect(
        sbomRegistry.connect(attacker).registerSBOM(hash, "malicious", signature)
      ).to.be.revertedWith("Invalid signature - signer does not match sender");
    });

    it("Should prevent signature reuse for different hash", async function () {
      const hash1 = createHash("sbom-v1");
      const hash2 = createHash("sbom-v2");

      const signature1 = await signHash(hash1, vendor1);

      await sbomRegistry.connect(vendor1).registerSBOM(hash1, "v1.0", signature1);

      await expect(
        sbomRegistry.connect(vendor1).registerSBOM(hash2, "v2.0", signature1)
      ).to.be.revertedWith("Invalid signature - signer does not match sender");
    });

    it("Should detect tampered SBOM content", async function () {
      const originalContent = '{"name":"MyApp","version":"1.0"}';
      const tamperedContent = '{"name":"MyApp","version":"1.0","malware":true}';

      const originalHash = createHash(originalContent);
      const tamperedHash = createHash(tamperedContent);

      const signature = await signHash(originalHash, vendor1);

      await sbomRegistry.connect(vendor1).registerSBOM(originalHash, "v1.0", signature);

      const [exists] = await sbomRegistry.verifySBOM(tamperedHash);
      expect(exists).to.be.false;
    });
  });

  // ==========================================
  // GAS ESTIMATION TESTS
  // ==========================================
  describe("Gas Estimation", function () {
    beforeEach(async function () {
      await sbomRegistry.registerVendor(
        vendor1.address,
        "Acme Corp",
        "https://acme.com",
        "security@acme.com"
      );
    });

    it("Should estimate gas for registerSBOM", async function () {
      const hash = createHash("test-sbom");
      const signature = await signHash(hash, vendor1);

      const tx = await sbomRegistry.connect(vendor1).registerSBOM(hash, "v1.0", signature);
      const receipt = await tx.wait();

      console.log(`      Gas used for registerSBOM: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(300000n);
    });

    it("Should estimate gas for updateSBOM", async function () {
      const hash1 = createHash("sbom-v1");
      const hash2 = createHash("sbom-v2");

      const sig1 = await signHash(hash1, vendor1);
      const sig2 = await signHash(hash2, vendor1);

      await sbomRegistry.connect(vendor1).registerSBOM(hash1, "v1.0", sig1);

      const tx = await sbomRegistry.connect(vendor1).updateSBOM(hash1, hash2, "v2.0", sig2);
      const receipt = await tx.wait();

      console.log(`      Gas used for updateSBOM: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(300000n);
    });
  });
});