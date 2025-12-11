const { hashSBOM } = require('../utils/hash');
const { getContractReadOnly } = require('../utils/contract');
// const { header, info, keyValue, displayVerification } = require('../utils/display');
const { header, info, error, keyValue, displayVerification } = require('../utils/display');

/**
 * Verify an SBOM against the blockchain
 * @param {string} sbomFilePath - Path to SBOM file
 * @param {object} options - Additional options
 */
async function verifyCommand(sbomFilePath, options = {}) {
  try {
    header('VERIFYING SBOM');
    
    // 1. Hash the file
    info(`Reading SBOM file: ${sbomFilePath}`);
    const hash = hashSBOM(sbomFilePath);
    keyValue('SBOM Hash', hash);
    
    // 2. Query blockchain
    console.log();
    info('Querying blockchain...');
    
    const contract = getContractReadOnly();
    const [exists, signatureValid, vendorVerified, vendorName] = 
      await contract.verifyCompleteSBOM(hash);
    
    // 3. Get detailed record if it exists
    let record = null;
    if (exists) {
      const [, recordData] = await contract.verifySBOM(hash);
      record = {
        vendor: recordData.vendor,
        timestamp: recordData.timestamp,
        metadata: recordData.metadata,
        previousHash: recordData.previousHash
      };
    }
    
    // 4. Display results
    console.log();
    displayVerification({
      exists,
      signatureValid,
      vendorVerified,
      vendorName
    });
    
    // 5. Show additional details
    if (exists && record) {
      console.log();
      header('SBOM DETAILS');
      keyValue('Vendor Address', record.vendor);
      keyValue('Registered At', new Date(Number(record.timestamp) * 1000).toLocaleString());
      keyValue('Metadata', record.metadata);
      
      if (record.previousHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        keyValue('Previous Version', record.previousHash);
      }
    }
    
    console.log();
    
    return {
      exists,
      signatureValid,
      vendorVerified,
      vendorName,
      hash
    };
    
  } catch (err) {
    console.log();
    error('Verification failed: ' + err.message);
    throw err;
  }
}

module.exports = verifyCommand;