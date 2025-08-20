# Blockchain Address Creator

A Node.js script for creating blockchain addresses and transferring ETH between them in a chain-like manner.

## Features

- **Seed Address Preparation**: Creates an initial seed address and waits for manual ETH funding
- **Chain Transfer**: Creates multiple addresses and transfers maximum available ETH from each to the next
- **Network Support**: Works with Base Sepolia testnet (default) and Ethereum Mainnet
- **Comprehensive Logging**: Logs all addresses, private keys, and balances for recovery
- **Gas Calculation**: Automatically calculates gas costs with safety buffers

## Prerequisites

- Node.js (v16 or higher)
- NPM or Yarn

## Installation

```bash
npm install ethers
```

## Usage

### Basic Usage (Base Sepolia Testnet, 5 addresses)
```bash
node index.js
```

### Custom Network and Address Count
```bash
# Ethereum Mainnet with 10 addresses
node index.js ethereum 10

# Base Sepolia with 3 addresses
node index.js baseSepolia 3
```

## How It Works

### 1. Seed Address Preparation
- Creates a new random wallet address
- Displays the address, public key, and private key
- Waits for you to manually transfer ETH to this address
- Continuously checks balance until you confirm the deposit

### 2. Address Creation Loop
- Creates N new addresses (default: 5)
- For each address:
  - Creates a new wallet
  - Calculates current gas costs with 10% buffer
  - Transfers maximum available balance (minus gas fees + safety buffer)
  - Logs transfer details and transaction hash

### 3. Final Result
- Displays the final address with private key and balance
- Shows all created addresses with their private keys and balances for recovery

## Network Configuration

### Base Sepolia Testnet (Default)
- RPC URL: `https://sepolia.base.org`
- Chain ID: 84532

### Ethereum Mainnet
- RPC URL: `https://eth.public-rpc.com`
- Chain ID: 1

## Gas Calculation

The script uses a conservative approach to gas calculation:
- Current gas price from the network
- 10% buffer added to gas price for safety
- Additional 0.000001 ETH safety buffer for transfer amount
- Gas limit: 21,000 (standard for ETH transfers)

## Error Handling

- Insufficient balance warnings
- Transfer failure details with balance information
- All addresses logged for recovery if script fails
- Gas cost vs balance comparison for debugging

## Security Notes

⚠️ **Important Security Considerations:**

- Private keys are displayed in console output - save them securely
- The script logs all private keys for recovery purposes
- Run this script in a secure environment
- Don't commit private keys to version control
- Consider using environment variables for RPC URLs in production

## Example Output

```
🚀 Address Creator Script
Network: baseSepolia
Address count: 5

=== Seed Address Preparation (Base Sepolia Testnet) ===
Creating new seed address...

Seed Address Created:
Address: 0x705F94EE75DE6Dfc7614AC5882D95E9bcC996FF9
Public Key: 0x...
Private Key: 0x...

⚠️  IMPORTANT: Please manually transfer ETH to this address for funding.
Network: Base Sepolia Testnet
RPC URL: https://sepolia.base.org

Current balance: 0.0 ETH
Has ETH been deposited? (yes/no): yes
✅ Confirmed! Balance: 0.001 ETH

=== Creating 5 Addresses with ETH Transfers ===

--- Step 1/5 ---
Created new address: 0xbC615961B97405645Bd5dEe76586E5fEb824010F
Private Key: 0x...
Current balance from 0x705F94EE75DE6Dfc7614AC5882D95E9bcC996FF9: 0.001 ETH
Gas cost: 0.000000021002205 ETH
Transferring 0.000999978997795 ETH to 0xbC615961B97405645Bd5dEe76586E5fEb824010F...
✅ Transfer completed! Hash: 0x...
Gas used: 0.000000021002205 ETH

=== FINAL RESULT ===
Last Address: 0x...
Private Key: 0x...
Balance: 0.000999978997795 ETH
Network: Base Sepolia Testnet

=== ALL ADDRESSES INFO ===

Address 1:
  Address: 0x...
  Private Key: 0x...
  Balance: 0.000999978997795 ETH
```

## Troubleshooting

### Common Issues

1. **"insufficient funds for intrinsic transaction cost"**
   - The balance is too low to cover gas fees
   - Solution: Add more ETH to the seed address

2. **"too many decimals for format"**
   - Fixed in the latest version with proper decimal handling

3. **Transfer fails but balance seems sufficient**
   - Gas prices may have increased during execution
   - The script includes safety buffers to prevent this

### Recovery

If the script fails, all created addresses are logged at the end. You can manually check their balances and continue transfers if needed.

## License

MIT License