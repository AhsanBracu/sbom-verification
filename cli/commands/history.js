const { hashSBOM } = require('../utils/hash');
const { getContractReadOnly } = require('../utils/contract');
const { error, info, header, displayHistory } = require('../utils/display');

/**
 * View version history of an SBOM
 * @param {string} hashOrFile - Hash (0x...) or file path
 * @param {object} options - Additional options
 */
async function historyCommand(hashOrFile, options = {}) {
  try {
    header('SBOM VERSION HISTORY');
    
    let hash;
    
    // Check if input is a hash or file path
    if (hashOrFile.startsWith('0x')) {
      // It's a hash
      hash = hashOrFile;
      info(`Using hash: ${hash}`);
    } else {
      // It's a file path
      info(`Reading SBOM file: ${hashOrFile}`);
      hash = hashSBOM(hashOrFile);
      info(`Computed hash: ${hash}`);
    }
    
    // Get contract
    console.log();
    info('Querying blockchain for version history...');
    const contract = getContractReadOnly();
    
    // Check if SBOM exists
    const [exists] = await contract.verifySBOM(hash);
    if (!exists) {
      console.log();
      error('SBOM not found on blockchain');
      info('This SBOM has never been registered');
      return { found: false };
    }
    
    // Get version history
    const history = await contract.getVersionHistory(hash);
    const rootHash = await contract.getRootHash(hash);
    
    // Get details for each version
    const records = {};
    for (const versionHash of history) {
      const [, record] = await contract.verifySBOM(versionHash);
      records[versionHash] = {
        vendor: record.vendor,
        timestamp: record.timestamp,
        metadata: record.metadata,
        previousHash: record.previousHash
      };
    }
    
    // Display history
    console.log();
    displayHistory(history, records);
    
    // Show root hash
    console.log();
    info(`Root Hash (v1): ${rootHash}`);
    info(`Current version: ${history.length} of ${history.length}`);
    
    console.log();
    
    return {
      found: true,
      history,
      rootHash,
      versionCount: history.length
    };
    
  } catch (err) {
    console.log();
    error('Failed to retrieve history: ' + err.message);
    throw err;
  }
}

module.exports = historyCommand;