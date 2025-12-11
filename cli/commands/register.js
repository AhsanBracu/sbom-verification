const { hashSBOM, extractMetadata } = require('../utils/hash');
const { signHash } = require('../utils/sign');
const { getContract } = require('../utils/contract');
const { success, error, info, header, keyValue, displayReceipt } = require('../utils/display');

/**
 * Register an SBOM on the blockchain
 * @param {string} sbomFilePath - Path to SBOM file
 * @param {Wallet} wallet - Vendor's wallet
 * @param {object} options - Additional options
 */
async function registerCommand(sbomFilePath, wallet, options = {}) {
  try {
    header('REGISTERING SBOM');
    
    // 1. Hash the file
    info(`Reading SBOM file: ${sbomFilePath}`);
    const hash = hashSBOM(sbomFilePath);
    keyValue('SBOM Hash', hash);
    
    // 2. Extract metadata
    const metadata = extractMetadata(sbomFilePath);
    const metadataString = JSON.stringify(metadata);
    keyValue('Metadata', metadataString);
    
    // 3. Sign the hash
    info('Signing with vendor wallet...');
    const signature = await signHash(hash, wallet);
    keyValue('Signature', signature.slice(0, 20) + '...');
    keyValue('Vendor Address', wallet.address);
    
    // 4. Register on blockchain
    console.log();
    info('Submitting transaction to blockchain...');
    
    const contract = getContract(wallet);
    const tx = await contract.registerSBOM(hash, metadataString, signature);
    
    info(`Transaction submitted: ${tx.hash}`);
    info('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    // 5. Display results
    console.log();
    success('SBOM SUCCESSFULLY REGISTERED!');
    displayReceipt(receipt);
    
    console.log();
    info('You can now verify this SBOM using:');
    console.log(`   sbom-cli verify ${sbomFilePath}`);
    console.log();
    
    return {
      hash,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
    
  } catch (err) {
    console.log();
    error('Registration failed: ' + err.message);
    
    if (err.message.includes('Vendor not verified')) {
      console.log();
      info('Your wallet address is not registered as a verified vendor.');
      info('Please contact the registry owner to get verified.');
      info('Your address: ' + wallet.address);
    }
    
    throw err;
  }
}

module.exports = registerCommand;