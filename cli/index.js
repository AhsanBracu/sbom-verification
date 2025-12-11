#!/usr/bin/env node

const { program } = require('commander');
const { createWallet } = require('./utils/sign');
const registerCommand = require('./commands/register');
const verifyCommand = require('./commands/verify');
const updateCommand = require('./commands/update');
const historyCommand = require('./commands/history');
const configCommand = require('./commands/config');

// CLI version
const VERSION = '1.0.0';

// Main program
program
  .name('sbom-cli')
  .description('SBOM Blockchain Registry - Command Line Tool')
  .version(VERSION);

// ==========================================
// CONFIG COMMAND
// ==========================================
program
  .command('config')
  .description('Configure CLI settings (contract address, RPC URL, etc.)')
  .option('-c, --contract <address>', 'Contract address')
  .option('-r, --rpc <url>', 'RPC URL')
  .option('-n, --network <name>', 'Network name')
  .action(async (options) => {
    try {
      await configCommand(options);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// ==========================================
// REGISTER COMMAND
// ==========================================
program
  .command('register <sbom-file>')
  .description('Register an SBOM on the blockchain')
  .requiredOption('-k, --key <private-key>', 'Vendor private key (without 0x prefix)')
  .action(async (sbomFile, options) => {
    try {
      const wallet = createWallet(options.key);
      await registerCommand(sbomFile, wallet, options);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// ==========================================
// VERIFY COMMAND
// ==========================================
program
  .command('verify <sbom-file>')
  .description('Verify an SBOM against the blockchain')
  .action(async (sbomFile, options) => {
    try {
      await verifyCommand(sbomFile, options);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// ==========================================
// UPDATE COMMAND
// ==========================================
program
  .command('update <old-file> <new-file>')
  .description('Update an SBOM to a new version')
  .requiredOption('-k, --key <private-key>', 'Vendor private key (without 0x prefix)')
  .action(async (oldFile, newFile, options) => {
    try {
      const wallet = createWallet(options.key);
      await updateCommand(oldFile, newFile, wallet, options);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// ==========================================
// HISTORY COMMAND
// ==========================================
program
  .command('history <hash-or-file>')
  .description('View version history of an SBOM')
  .action(async (hashOrFile, options) => {
    try {
      await historyCommand(hashOrFile, options);
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// ==========================================
// INFO COMMAND
// ==========================================
program
  .command('info')
  .description('Display current configuration')
  .action(() => {
    try {
      const { loadConfig, getContractAddress, getRpcUrl, getNetworkName } = require('./utils/contract');
      const config = loadConfig();
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 CURRENT CONFIGURATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Contract Address:', getContractAddress());
      console.log('RPC URL:', getRpcUrl());
      console.log('Network:', getNetworkName());
      console.log();
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.log('\n💡 Run "sbom-cli config" to set up configuration\n');
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}