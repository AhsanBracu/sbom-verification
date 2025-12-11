const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Contract ABI - Essential functions only
const CONTRACT_ABI = [
  "function registerSBOM(bytes32 hash, string metadata, bytes signature) public",
  "function updateSBOM(bytes32 oldHash, bytes32 newHash, string metadata, bytes signature) public",
  "function verifySBOM(bytes32 hash) public view returns (bool exists, tuple(bytes32 hash, address vendor, uint256 timestamp, string metadata, bytes32 previousHash, bytes signature) record)",
  "function verifyCompleteSBOM(bytes32 hash) public view returns (bool exists, bool signatureValid, bool vendorVerified, string vendorName)",
  "function getVersionHistory(bytes32 hash) public view returns (bytes32[] memory)",
  "function getVersionCount(bytes32 hash) public view returns (uint256)",
  "function getRootHash(bytes32 hash) public view returns (bytes32)",
  "function isVerifiedVendor(address vendor) public view returns (bool)",
  "function getVendorInfo(address vendor) public view returns (tuple(string name, string website, string contactEmail, bool verified, uint256 registeredAt))",
  "function registryOwner() public view returns (address)"
];

/**
 * Load configuration from file
 * @returns {object} - Configuration object
 */
function loadConfig() {
  const configPath = path.join(__dirname, '../../config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}\nPlease run 'sbom-cli config' first.`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  if (!config.contractAddress) {
    throw new Error('Contract address not configured. Please run deployment first.');
  }

  if (!config.rpcUrl) {
    throw new Error('RPC URL not configured.');
  }

  return config;
}

/**
 * Save configuration to file
 * @param {object} config - Configuration object
 */
function saveConfig(config) {
  const configPath = path.join(__dirname, '../../config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Get contract instance for reading (view functions)
 * @returns {Contract} - Read-only contract instance
 */
function getContractReadOnly() {
  const config = loadConfig();
  
  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  
  // Create read-only contract instance
  const contract = new ethers.Contract(
    config.contractAddress,
    CONTRACT_ABI,
    provider
  );
  
  return contract;
}

/**
 * Get contract instance for writing (transactions)
 * @param {Wallet} wallet - Wallet with private key for signing
 * @returns {Contract} - Contract instance with signer
 */
function getContract(wallet) {
  const config = loadConfig();
  
  // Connect to blockchain
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  
  // Connect wallet to provider
  const signer = wallet.connect(provider);
  
  // Create contract instance with signer
  const contract = new ethers.Contract(
    config.contractAddress,
    CONTRACT_ABI,
    signer
  );
  
  return contract;
}

/**
 * Get contract address from config
 * @returns {string} - Contract address
 */
function getContractAddress() {
  const config = loadConfig();
  return config.contractAddress;
}

/**
 * Get RPC URL from config
 * @returns {string} - RPC URL
 */
function getRpcUrl() {
  const config = loadConfig();
  return config.rpcUrl;
}

/**
 * Get network name from config
 * @returns {string} - Network name
 */
function getNetworkName() {
  const config = loadConfig();
  return config.network || 'unknown';
}

module.exports = {
  getContract,
  getContractReadOnly,
  getContractAddress,
  getRpcUrl,
  getNetworkName,
  loadConfig,
  saveConfig,
  CONTRACT_ABI
};