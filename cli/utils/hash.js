const fs = require('fs');
const { ethers } = require('ethers');

/**
 * Hash an SBOM file (Simple approach - Phase 1)
 * Hashes the file content as-is
 * @param {string} filePath - Path to SBOM file
 * @returns {string} - Keccak256 hash (0x...)
 */
function hashSBOMSimple(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read file content
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Hash it directly
  const hash = ethers.keccak256(ethers.toUtf8Bytes(fileContent));
  
  return hash;
}

/**
 * Hash an SBOM file (Advanced - Phase 2)
 * Parses JSON and normalizes before hashing
 * @param {string} filePath - Path to SBOM file
 * @returns {string} - Keccak256 hash (0x...)
 */
function hashSBOMNormalized(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    // Read and parse
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const sbom = JSON.parse(fileContent);
    
    // Normalize: sorted keys, no whitespace
    const normalized = JSON.stringify(sbom, Object.keys(sbom).sort());
    
    // Hash normalized version
    const hash = ethers.keccak256(ethers.toUtf8Bytes(normalized));
    
    return hash;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON file');
    }
    throw error;
  }
}

/**
 * Extract metadata from SBOM file
 * @param {string} filePath - Path to SBOM file
 * @returns {object} - Metadata object
 */
function extractMetadata(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const sbom = JSON.parse(fileContent);
    
    return {
      name: sbom.name || 'Unknown',
      version: sbom.version || '1.0.0',
      timestamp: Date.now(),
      format: sbom.spdxVersion ? 'SPDX' : sbom.bomFormat ? 'CycloneDX' : 'Unknown'
    };
  } catch (error) {
    return {
      name: 'Unknown',
      version: '1.0.0',
      timestamp: Date.now(),
      format: 'Unknown'
    };
  }
}

module.exports = {
  hashSBOMSimple,
  hashSBOMNormalized,
  extractMetadata,
  // Export the one to use by default
  hashSBOM: hashSBOMSimple  // Start with simple, switch to normalized later
};