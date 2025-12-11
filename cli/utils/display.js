const chalk = require('chalk');

/**
 * Display success message
 * @param {string} message - Message to display
 */
function success(message) {
  console.log(chalk.green('✅ ' + message));
}

/**
 * Display error message
 * @param {string} message - Message to display
 */
function error(message) {
  console.log(chalk.red('❌ ' + message));
}

/**
 * Display warning message
 * @param {string} message - Message to display
 */
function warning(message) {
  console.log(chalk.yellow('⚠️  ' + message));
}

/**
 * Display info message
 * @param {string} message - Message to display
 */
function info(message) {
  console.log(chalk.blue('ℹ️  ' + message));
}

/**
 * Display section header
 * @param {string} title - Section title
 */
function header(title) {
  console.log('\n' + chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold.cyan(title));
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') + '\n');
}

/**
 * Display key-value pair
 * @param {string} key - Key name
 * @param {string} value - Value
 */
function keyValue(key, value) {
  console.log(chalk.gray(key + ':'), chalk.white(value));
}

/**
 * Display verification results
 * @param {object} results - Verification results
 */
function displayVerification(results) {
  header('VERIFICATION RESULTS');
  
  if (!results.exists) {
    error('SBOM NOT FOUND on blockchain');
    info('This SBOM has never been registered');
    return;
  }
  
  keyValue('SBOM Exists', '✅ Yes');
  keyValue('Signature Valid', results.signatureValid ? '✅ Yes' : '❌ No');
  keyValue('Vendor Verified', results.vendorVerified ? '✅ Yes' : '❌ No');
  keyValue('Vendor Name', results.vendorName);
  
  console.log();
  
  if (results.signatureValid && results.vendorVerified) {
    success(`TRUSTED: This SBOM is verified and from trusted vendor "${results.vendorName}"`);
  } else if (results.signatureValid && !results.vendorVerified) {
    warning(`CAUTION: Signature is valid but vendor "${results.vendorName}" is no longer verified`);
  } else {
    error('DO NOT TRUST: Invalid signature or unverified vendor');
  }
}

/**
 * Display transaction receipt
 * @param {object} receipt - Transaction receipt
 */
function displayReceipt(receipt) {
  console.log();
  keyValue('Transaction Hash', receipt.hash);
  keyValue('Block Number', receipt.blockNumber);
  keyValue('Gas Used', receipt.gasUsed.toString());
  keyValue('Status', receipt.status === 1 ? '✅ Success' : '❌ Failed');
}

/**
 * Display version history
 * @param {array} history - Array of version hashes
 * @param {object} records - Map of hash to record info
 */
function displayHistory(history, records) {
  header('VERSION HISTORY');
  
  console.log(chalk.gray(`Found ${history.length} version(s):\n`));
  
  history.forEach((hash, index) => {
    const record = records[hash];
    console.log(chalk.bold(`Version ${index + 1}:`));
    keyValue('  Hash', hash);
    if (record) {
      keyValue('  Metadata', record.metadata);
      keyValue('  Timestamp', new Date(Number(record.timestamp) * 1000).toLocaleString());
      keyValue('  Vendor', record.vendor);
    }
    console.log();
  });
}

/**
 * Truncate hash for display
 * @param {string} hash - Full hash
 * @param {number} length - Length to show
 * @returns {string} - Truncated hash
 */
function truncateHash(hash, length = 10) {
  if (hash.length <= length) return hash;
  return hash.slice(0, length) + '...' + hash.slice(-6);
}

module.exports = {
  success,
  error,
  warning,
  info,
  header,
  keyValue,
  displayVerification,
  displayReceipt,
  displayHistory,
  truncateHash
};