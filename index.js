const { ethers } = require('ethers');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class Logger {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.logFile = path.join(__dirname, 'logs', `address-creator-${this.timestamp}.log`);
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(message);
    this.logStream.write(logMessage + '\n');
  }

  error(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(`❌ ${message}`);
    this.logStream.write(logMessage + '\n');
  }

  close() {
    this.logStream.end();
  }
}

const NETWORKS = {
  baseSepolia: {
    name: 'Base Sepolia Testnet',
    rpcUrl: 'https://sepolia.base.org',
    chainId: 84532
  },
  ethereum: {
    name: 'Ethereum Mainnet',
    // rpcUrl: 'https://eth.public-rpc.com',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    chainId: 1
  }
};

class AddressCreator {
  constructor(network = 'baseSepolia', logger) {
    this.network = NETWORKS[network];
    if (!this.network) {
      throw new Error(`Network ${network} not supported`);
    }
    this.provider = new ethers.JsonRpcProvider(this.network.rpcUrl);
    this.logger = logger;
  }

  async createWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey
    };
  }

  async getBalance(address) {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async calculateGasCost() {
    const gasLimit = 21000;
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    
    // Add 10% buffer to gas price for safety
    const bufferedGasPrice = (gasPrice * BigInt(110)) / BigInt(100);
    const gasCost = bufferedGasPrice * BigInt(gasLimit);
    
    return {
      gasLimit,
      gasPrice: bufferedGasPrice,
      gasCost,
      gasCostEth: ethers.formatEther(gasCost)
    };
  }

  async transferETH(fromWallet, toAddress, amount) {
    const wallet = new ethers.Wallet(fromWallet.privateKey, this.provider);
    const gasInfo = await this.calculateGasCost();
    
    const tx = {
      to: toAddress,
      value: ethers.parseEther(amount),
      gasLimit: gasInfo.gasLimit,
      gasPrice: gasInfo.gasPrice
    };
    
    const transaction = await wallet.sendTransaction(tx);
    await transaction.wait();
    return { transaction, gasInfo };
  }

  async prepareSeedAddress() {
    this.logger.log(`\n=== Seed Address Preparation (${this.network.name}) ===`);
    this.logger.log('Creating new seed address...');
    
    const seedWallet = await this.createWallet();
    
    this.logger.log('\nSeed Address Created:');
    this.logger.log(`Address: ${seedWallet.address}`);
    this.logger.log(`Public Key: ${seedWallet.publicKey}`);
    this.logger.log(`Private Key: ${seedWallet.privateKey}`);
    
    this.logger.log('\n⚠️  IMPORTANT: Please manually transfer ETH to this address for funding.');
    this.logger.log(`Network: ${this.network.name}`);
    this.logger.log(`RPC URL: ${this.network.rpcUrl}`);
    
    return new Promise((resolve) => {
      const checkBalance = async () => {
        const balance = await this.getBalance(seedWallet.address);
        this.logger.log(`\nCurrent balance: ${balance} ETH`);
        
        rl.question('Has ETH been deposited? (yes/no): ', async (answer) => {
          if (answer.toLowerCase() === 'yes') {
            const finalBalance = await this.getBalance(seedWallet.address);
            if (parseFloat(finalBalance) > 0) {
              this.logger.log(`✅ Confirmed! Balance: ${finalBalance} ETH`);
              resolve(seedWallet);
            } else {
              this.logger.log('❌ No ETH detected. Please try again.');
              setTimeout(checkBalance, 5000);
            }
          } else {
            setTimeout(checkBalance, 5000);
          }
        });
      };
      
      setTimeout(checkBalance, 5000);
    });
  }

  async createAndTransferAddresses(seedWallet, count = 5) {
    this.logger.log(`\n=== Creating ${count} Addresses with ETH Transfers ===`);
    
    let currentWallet = seedWallet;
    const addresses = [];
    
    for (let i = 1; i <= count; i++) {
      this.logger.log(`\n--- Step ${i}/${count} ---`);
      
      const newWallet = await this.createWallet();
      this.logger.log(`Created new address: ${newWallet.address}`);
      this.logger.log(`Private Key: ${newWallet.privateKey}`);
      
      const currentBalance = await this.getBalance(currentWallet.address);
      this.logger.log(`Current balance from ${currentWallet.address}: ${currentBalance} ETH`);
      
      if (parseFloat(currentBalance) > 0) {
        const gasInfo = await this.calculateGasCost();
        this.logger.log(`Gas cost: ${gasInfo.gasCostEth} ETH`);
        
        const currentBalanceWei = await this.provider.getBalance(currentWallet.address);
        const maxTransferAmountWei = currentBalanceWei - gasInfo.gasCost;
        
        if (maxTransferAmountWei > 0) {
          // Additional safety buffer - reduce transfer amount by 0.000001 ETH
          const safetyBuffer = ethers.parseEther('0.000001');
          const safeTransferAmountWei = maxTransferAmountWei > safetyBuffer ? 
            maxTransferAmountWei - safetyBuffer : BigInt(0);
          
          if (safeTransferAmountWei > 0) {
            const transferAmountEth = ethers.formatEther(safeTransferAmountWei);
            this.logger.log(`Transferring ${transferAmountEth} ETH to ${newWallet.address}...`);
            
            try {
              const result = await this.transferETH(currentWallet, newWallet.address, transferAmountEth);
              this.logger.log(`✅ Transfer completed! Hash: ${result.transaction.hash}`);
              this.logger.log(`Gas used: ${result.gasInfo.gasCostEth} ETH`);
            } catch (error) {
              this.logger.error(`Transfer failed: ${error.message}`);
              this.logger.log(`Transfer amount: ${transferAmountEth} ETH`);
              this.logger.log(`Gas cost: ${gasInfo.gasCostEth} ETH`);
              this.logger.log(`Balance: ${currentBalance} ETH`);
            }
          } else {
            this.logger.log('⚠️  Insufficient balance for transfer (after safety buffer)');
            this.logger.log(`Balance: ${currentBalance} ETH, Gas needed: ${gasInfo.gasCostEth} ETH`);
          }
        } else {
          this.logger.log('⚠️  Insufficient balance for transfer (balance too low to cover gas fees)');
          this.logger.log(`Balance: ${currentBalance} ETH, Gas needed: ${gasInfo.gasCostEth} ETH`);
        }
      } else {
        this.logger.log('⚠️  No balance available for transfer');
      }
      
      addresses.push(newWallet);
      currentWallet = newWallet;
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return addresses;
  }

  async displayFinalResult(addresses) {
    const finalWallet = addresses[addresses.length - 1];
    const finalBalance = await this.getBalance(finalWallet.address);
    
    this.logger.log('\n=== FINAL RESULT ===');
    this.logger.log(`Last Address: ${finalWallet.address}`);
    this.logger.log(`Private Key: ${finalWallet.privateKey}`);
    this.logger.log(`Balance: ${finalBalance} ETH`);
    this.logger.log(`Network: ${this.network.name}`);
    
    this.logger.log('\n=== ALL ADDRESSES INFO ===');
    for (let i = 0; i < addresses.length; i++) {
      const wallet = addresses[i];
      const balance = await this.getBalance(wallet.address);
      this.logger.log(`\nAddress ${i + 1}:`);
      this.logger.log(`  Address: ${wallet.address}`);
      this.logger.log(`  Private Key: ${wallet.privateKey}`);
      this.logger.log(`  Balance: ${balance} ETH`);
    }
  }
}

async function main() {
  const logger = new Logger();
  
  try {
    const network = process.argv[2] || 'baseSepolia';
    const count = parseInt(process.argv[3]) || 5;
    
    logger.log(`🚀 Address Creator Script`);
    logger.log(`Network: ${network}`);
    logger.log(`Address count: ${count}`);
    logger.log(`Log file: ${logger.logFile}`);
    
    const creator = new AddressCreator(network, logger);
    
    const seedWallet = await creator.prepareSeedAddress();
    const addresses = await creator.createAndTransferAddresses(seedWallet, count);
    await creator.displayFinalResult(addresses);
    
    logger.log('\n=== EXECUTION COMPLETED SUCCESSFULLY ===');
    logger.close();
    rl.close();
  } catch (error) {
    logger.error(`Script execution failed: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    logger.close();
    rl.close();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AddressCreator;