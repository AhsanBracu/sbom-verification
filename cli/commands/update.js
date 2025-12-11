const { hashSBOM, extractMetadata } = require('../utils/hash');
const { signHash } = require('../utils/sign');
const { getContract, getContractReadOnly } = require('../utils/contract');
const { success, error, info, warning, header, keyValue, displayReceipt } = require('../utils/display');

/**
 * Update an SBOM to a new version
 * @param {string} oldFilePath - Path to old SBOM file
 * @param {string} newFilePath - Path to new SBOM file
 * @param {Wallet} wallet - Vendor's wallet
 * @param {object} options - Additional options
 */
async function updateCommand(oldFilePath, newFilePath, wallet, options = {}) {
  try {
    header('UPDATING SBOM VERSION');
    
    // 1. Hash both files
    info(`Reading old SBOM: ${oldFilePath}`);
    const oldHash = hashSBOM(oldFilePath);
    keyValue('Old Hash', oldHash);
    
    info(`Reading new SBOM: ${newFilePath}`);
    const newHash = hashSBOM(newFilePath);
    keyValue('New Hash', newHash);
    
    // 2. Check if hashes are different
    if (oldHash === newHash) {
      warning('Files are identical (same hash). No update needed.');
      return { updated: false };
    }
    
    // 3. Verify old SBOM exists
    console.log();
    info('Verifying old SBOM exists...');
    const contractRO = getContractReadOnly();
    const [exists] = await contractRO.verifySBOM(oldHash);
    
    if (!exists) {
      error('Old SBOM not found on blockchain!');
      info('Please register it first using: sbom-cli register');
      throw new Error('Old SBOM not registered');
    }
    
    success('Old SBOM found on blockchain');
    
    // 4. Extract metadata from new file
    const metadata = extractMetadata(newFilePath);
    const metadataString = JSON.stringify(metadata);
    keyValue('New Metadata', metadataString);
    
    // 5. Sign the new hash
    info('Signing new version with vendor wallet...');
    const signature = await signHash(newHash, wallet);
    keyValue('Signature', signature.slice(0, 20) + '...');
    
    // 6. Submit update transaction
    console.log();
    info('Submitting update transaction to blockchain...');
    
    const contract = getContract(wallet);
    const tx = await contract.updateSBOM(oldHash, newHash, metadataString, signature);
    
    info(`Transaction submitted: ${tx.hash}`);
    info('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    // 7. Display results
    console.log();
    success('SBOM VERSION UPDATED SUCCESSFULLY!');
    displayReceipt(receipt);
    
    // 8. Show version history
    console.log();
    const history = await contractRO.getVersionHistory(newHash);
    info(`This SBOM now has ${history.length} version(s) in its history`);
    
    console.log();
    info('You can view version history using:');
    console.log(`   sbom-cli history ${newHash}`);
    console.log();
    
    return {
      updated: true,
      oldHash,
      newHash,
      txHash: receipt.hash,
      versionCount: history.length
    };
    
  } catch (err) {
    console.log();
    error('Update failed: ' + err.message);
    
    if (err.message.includes('Only original vendor')) {
      console.log();
      info('Only the original vendor can update this SBOM.');
      info('Your address: ' + wallet.address);
    }
    
    throw err;
  }
}

module.exports = updateCommand;