const { saveConfig } = require('../utils/contract');
// const { success, info, header, keyValue } = require('../utils/display');
const { success, error, info, header, keyValue } = require('../utils/display');
const readline = require('readline');

/**
 * Prompt user for input
 * @param {string} question - Question to ask
 * @returns {Promise<string>} - User's answer
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Configure CLI settings
 * @param {object} options - Configuration options
 */
async function configCommand(options = {}) {
  try {
    header('CLI CONFIGURATION');
    
    let config = {};
    
    // Get contract address
    if (options.contract) {
      config.contractAddress = options.contract;
    } else {
      config.contractAddress = await prompt('Contract Address (0x...): ');
    }
    
    // Get RPC URL
    if (options.rpc) {
      config.rpcUrl = options.rpc;
    } else {
      const defaultRpc = 'http://localhost:8545';
      const rpc = await prompt(`RPC URL [${defaultRpc}]: `);
      config.rpcUrl = rpc || defaultRpc;
    }
    
    // Get network name
    if (options.network) {
      config.network = options.network;
    } else {
      const defaultNetwork = 'localhost';
      const network = await prompt(`Network name [${defaultNetwork}]: `);
      config.network = network || defaultNetwork;
    }
    
    // Save configuration
    saveConfig(config);
    
    console.log();
    success('Configuration saved successfully!');
    
    console.log();
    header('CURRENT CONFIGURATION');
    keyValue('Contract Address', config.contractAddress);
    keyValue('RPC URL', config.rpcUrl);
    keyValue('Network', config.network);
    
    console.log();
    info('You can now use the CLI to interact with the contract');
    console.log();
    
    return config;
    
  } catch (err) {
    error('Configuration failed: ' + err.message);
    throw err;
  }
}

module.exports = configCommand;