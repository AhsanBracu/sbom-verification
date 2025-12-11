const { ethers } = require('ethers');

/**
 * Sign a hash with a wallet's private key
 * @param {string} hash - The hash to sign (0x...)
 * @param {Wallet} wallet - Ethers wallet with private key
 * @returns {Promise<string>} - Signature (0x...)
 */
async function signHash(hash, wallet) {
  if (!hash.startsWith('0x') || hash.length !== 66) {
    throw new Error('Invalid hash format');
  }

  // Sign the hash
  const signature = await wallet.signMessage(ethers.getBytes(hash));
  
  return signature;
}

/**
 * Create a wallet from private key
 * @param {string} privateKey - Private key (with or without 0x prefix)
 * @returns {Wallet} - Ethers wallet instance
 */
function createWallet(privateKey) {
  // Add 0x prefix if missing
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet;
  } catch (error) {
    throw new Error('Invalid private key');
  }
}

/**
 * Verify a signature
 * @param {string} hash - The hash that was signed
 * @param {string} signature - The signature to verify
 * @param {string} expectedAddress - Expected signer address
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(hash, signature, expectedAddress) {
  try {
    // Recover the signer's address from signature
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(hash),
      signature
    );
    
    // Compare with expected address (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}

module.exports = {
  signHash,
  createWallet,
  verifySignature
};