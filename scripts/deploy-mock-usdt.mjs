import { ethers, JsonRpcProvider, Wallet, ContractFactory } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRIVATE_KEY = '0162e5338c2c8e71f70daff4a07c539e50a65d868407a041740ec60116e4df46';
const AMOY_RPC = 'https://rpc-amoy.polygon.technology';

// Load contract artifact
function loadArtifact() {
  const artifactPath = path.join(__dirname, '..', 'contracts', 'artifacts', 'contracts', 'mocks', 'MockUSDT.sol', 'MockUSDT.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

async function main() {
  console.log('========================================');
  console.log('  Deploy MockUSDT to Amoy Testnet');
  console.log('========================================\n');

  // Connect to Amoy
  const provider = new JsonRpcProvider(AMOY_RPC);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  
  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC\n');

  // Load artifact
  const artifact = loadArtifact();
  
  // Deploy MockUSDT
  console.log('Deploying MockUSDT...');
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  const mockUSDT = await factory.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  
  console.log('✓ MockUSDT deployed:', mockUSDTAddress);
  
  // Check initial balance (1 million USDT minted to deployer)
  const usdtBalance = await mockUSDT.balanceOf(wallet.address);
  console.log('\nYour USDT balance:', ethers.formatUnits(usdtBalance, 6), 'USDT');

  console.log('\n========================================');
  console.log('        ✓ DEPLOYMENT COMPLETE!');
  console.log('========================================\n');

  // Update .env
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Update USDT address
    envContent = envContent.replace(
      /NEXT_PUBLIC_USDT_ADDRESS=.*/,
      `NEXT_PUBLIC_USDT_ADDRESS=${mockUSDTAddress}`
    );
  } catch (e) {
    // Create new .env if doesn't exist
    envContent = `NEXT_PUBLIC_USDT_ADDRESS=${mockUSDTAddress}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✓ .env updated with MockUSDT address');
  
  console.log('\n📝 How to mint more USDT:');
  console.log('---');
  console.log('Contract Address:', mockUSDTAddress);
  console.log('---');
  console.log('\nOption 1 - Using the dApp:');
  console.log('The dApp now uses MockUSDT - you already have 1,000,000 USDT!');
  console.log('\nOption 2 - Mint more via contract call:');
  console.log('Function: mintToSelf(uint256 amount)');
  console.log('Example: mintToSelf(100000) -> mints 100,000 USDT to your wallet');
  console.log('\nOption 3 - Mint to any address:');
  console.log('Function: mint(address to, uint256 amount)');
  console.log('Example: mint(0xYourAddress, 50000) -> mints 50,000 USDT');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
