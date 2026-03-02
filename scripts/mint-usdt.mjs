import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRIVATE_KEY = '0x0162e5338c2c8e71f70daff4a07c539e50a65d868407a041740ec60116e4df46';
const AMOY_RPC = 'https://rpc-amoy.polygon.technology';
const MOCK_USDT_ADDRESS = '0x1E7C689D2da8DCc87bB4E1E4f8650551bd538719';
const USER_ADDRESS = '0x642dA0e0C51e02d4Fe7C4b557C49F9D1111cF903';

// MockUSDT ABI
const MOCK_USDT_ABI = [
  'function mint(address to, uint256 amount) public',
  'function mintToSelf(uint256 amount) public',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function main() {
  console.log('========================================');
  console.log('  Minting 10,000 USDT to your wallet');
  console.log('========================================\n');

  // Connect to Amoy
  const provider = new JsonRpcProvider(AMOY_RPC);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  
  // Get contract instance
  const usdt = new Contract(MOCK_USDT_ADDRESS, MOCK_USDT_ABI, wallet);
  
  // Check current balance
  const currentBalance = await usdt.balanceOf(USER_ADDRESS);
  const decimals = await usdt.decimals();
  console.log('Current USDT balance:', ethers.formatUnits(currentBalance, decimals), 'USDT');
  
  // Mint 10,000 USDT
  const amountToMint = 10000n * (10n ** BigInt(decimals)); // 10,000 USDT
  
  console.log('\nMinting 10,000 USDT...');
  const tx = await usdt.mint(USER_ADDRESS, 10000); // Contract multiplies by 10^6
  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for confirmation...');
  
  const receipt = await tx.wait();
  console.log('✓ Transaction confirmed!');
  console.log('Block:', receipt.blockNumber);
  
  // Check new balance
  const newBalance = await usdt.balanceOf(USER_ADDRESS);
  console.log('\nNew USDT balance:', ethers.formatUnits(newBalance, decimals), 'USDT');
  
  console.log('\n========================================');
  console.log('        ✓ MINTING COMPLETE!');
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
