import { ethers, JsonRpcProvider, Wallet, ContractFactory } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// POLYGON MAINNET CONFIGURATION
// ==========================================
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0162e5338c2c8e71f70daff4a07c539e50a65d868407a041740ec60116e4df46';

// Polygon Mainnet RPC - multiple options for redundancy (try in order)
const POLYGON_RPCS = [
  process.env.POLYGON_RPC_URL,
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://polygon-rpc.com',
  'https://rpc.polygon.pulsechain.com',
].filter(Boolean);

// Official USDT on Polygon Mainnet
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

// Load contract artifacts
function loadArtifact(contractName, folder = 'core') {
  const artifactPath = path.join(__dirname, '..', 'contracts', 'artifacts', 'contracts', folder, `${contractName}.sol`, `${contractName}.json`);
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

async function main() {
  console.log('========================================');
  console.log('  YieldVault DeFi - Polygon Mainnet Deploy');
  console.log('========================================\n');

  // Try multiple RPCs until one works
  let provider = null;
  let workingRpc = null;
  
  console.log('Trying RPC endpoints...');
  for (const rpc of POLYGON_RPCS) {
    try {
      console.log(`  Trying: ${rpc}`);
      const testProvider = new JsonRpcProvider(rpc, undefined, { timeout: 10000 });
      const network = await testProvider.getNetwork();
      if (network.chainId === 137n) {
        provider = testProvider;
        workingRpc = rpc;
        console.log(`  ✓ Connected to Polygon Mainnet via: ${rpc}\n`);
        break;
      }
    } catch (e) {
      console.log(`  ✗ Failed: ${e.message?.substring(0, 50) || 'Unknown error'}`);
    }
  }
  
  if (!provider) {
    console.error('\n❌ Could not connect to any Polygon RPC endpoint.');
    console.error('Please set POLYGON_RPC_URL environment variable with a working RPC URL.');
    console.error('You can get a free RPC URL from:');
    console.error('  - Alchemy: https://www.alchemy.com/');
    console.error('  - Infura: https://infura.io/');
    console.error('  - QuickNode: https://www.quicknode.com/');
    process.exit(1);
  }

  const wallet = new Wallet(PRIVATE_KEY, provider);
  
  console.log('Network: Polygon Mainnet (Chain ID: 137)');
  console.log('Deployer:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'POL\n');

  if (balance < ethers.parseEther('0.1')) {
    console.log('⚠️  Warning: Low balance. You need at least 0.1 POL for deployment.');
    console.log('Get POL from exchanges or bridges.');
    return;
  }

  const ADMIN = wallet.address;  // Owner of all contracts
  const TREASURY = wallet.address; // Treasury address (can be changed later)

  console.log('Configuration:');
  console.log('- Admin:', ADMIN);
  console.log('- Treasury:', TREASURY);
  console.log('- USDT (Official):', USDT_ADDRESS);
  console.log('\n=== Deploying Core Contracts ===\n');

  // 1. Deploy Config
  console.log('1. Deploying Config...');
  const configArtifact = loadArtifact('Config');
  const ConfigFactory = new ContractFactory(configArtifact.abi, configArtifact.bytecode, wallet);
  const config = await ConfigFactory.deploy(ADMIN, TREASURY, USDT_ADDRESS);
  await config.waitForDeployment();
  const configAddress = await config.getAddress();
  console.log('   ✓ Config:', configAddress);

  // 2. Deploy FeeDistributor
  console.log('\n2. Deploying FeeDistributor...');
  const feeArtifact = loadArtifact('FeeDistributor');
  const FeeFactory = new ContractFactory(feeArtifact.abi, feeArtifact.bytecode, wallet);
  const feeDistributor = await FeeFactory.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await feeDistributor.waitForDeployment();
  const feeDistributorAddress = await feeDistributor.getAddress();
  console.log('   ✓ FeeDistributor:', feeDistributorAddress);

  // 3. Deploy Referral
  console.log('\n3. Deploying Referral...');
  const referralArtifact = loadArtifact('Referral');
  const ReferralFactory = new ContractFactory(referralArtifact.abi, referralArtifact.bytecode, wallet);
  const referral = await ReferralFactory.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await referral.waitForDeployment();
  const referralAddress = await referral.getAddress();
  console.log('   ✓ Referral:', referralAddress);

  console.log('   Linking FeeDistributor to Referral...');
  const linkReferralTx = await referral.setFeeDistributor(feeDistributorAddress);
  await linkReferralTx.wait();
  console.log('   ✓ FeeDistributor linked');

  // 4. Deploy Vault
  console.log('\n4. Deploying Vault...');
  const vaultArtifact = loadArtifact('Vault');
  const VaultFactory = new ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, wallet);
  const vault = await VaultFactory.deploy(USDT_ADDRESS, configAddress, ADMIN);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log('   ✓ Vault:', vaultAddress);

  console.log('   Linking contracts to Vault...');
  const setReferralTx = await vault.setReferralContract(referralAddress);
  await setReferralTx.wait();
  const setFeeTx = await vault.setFeeDistributor(feeDistributorAddress);
  await setFeeTx.wait();
  console.log('   ✓ Contracts linked to Vault');

  // 5. Deploy Strategies (Real Aave V3 and QuickSwap V3 implementations)
  console.log('\n5. Deploying Strategies...');
  
  // Aave V3 Strategy
  console.log('   Deploying AaveV3Strategy...');
  const aaveV3Artifact = loadArtifact('AaveV3Strategy', 'strategies');
  const AaveV3Factory = new ContractFactory(aaveV3Artifact.abi, aaveV3Artifact.bytecode, wallet);
  const aaveV3Strategy = await AaveV3Factory.deploy(USDT_ADDRESS, ADMIN);
  await aaveV3Strategy.waitForDeployment();
  const aaveV3StrategyAddress = await aaveV3Strategy.getAddress();
  console.log('   ✓ AaveV3Strategy:', aaveV3StrategyAddress);

  // QuickSwap V3 Strategy
  console.log('   Deploying QuickSwapV3Strategy...');
  const quickswapV3Artifact = loadArtifact('QuickSwapV3Strategy', 'strategies');
  const QuickSwapV3Factory = new ContractFactory(quickswapV3Artifact.abi, quickswapV3Artifact.bytecode, wallet);
  const quickswapV3Strategy = await QuickSwapV3Factory.deploy(USDT_ADDRESS, ADMIN);
  await quickswapV3Strategy.waitForDeployment();
  const quickswapV3StrategyAddress = await quickswapV3Strategy.getAddress();
  console.log('   ✓ QuickSwapV3Strategy:', quickswapV3StrategyAddress);

  // 6. Setup Roles
  console.log('\n6. Setting up roles...');
  const grantVaultRoleTx = await feeDistributor.grantVaultRole(vaultAddress);
  await grantVaultRoleTx.wait();
  const grantReferralRoleTx = await feeDistributor.grantReferralRole(referralAddress);
  await grantReferralRoleTx.wait();
  const vaultRoleOnReferralTx = await referral.grantVaultRole(vaultAddress);
  await vaultRoleOnReferralTx.wait();
  console.log('   ✓ Roles configured');

  // 7. Update Config
  console.log('\n7. Updating config...');
  const setVaultTx = await config.setVault(vaultAddress);
  await setVaultTx.wait();
  const setReferralConfigTx = await config.setReferralContract(referralAddress);
  await setReferralConfigTx.wait();
  const setFeeConfigTx = await config.setFeeDistributor(feeDistributorAddress);
  await setFeeConfigTx.wait();
  console.log('   ✓ Config updated');

  // 8. Link Strategies to Vault
  console.log('\n8. Adding strategies to Vault...');
  const addAaveV3Tx = await vault.addStrategy(aaveV3StrategyAddress, 5000); // 50% allocation
  await addAaveV3Tx.wait();
  const addQuickSwapV3Tx = await vault.addStrategy(quickswapV3StrategyAddress, 5000); // 50% allocation
  await addQuickSwapV3Tx.wait();
  console.log('   ✓ Strategies added (50% Aave V3, 50% QuickSwap V3)');

  // Summary
  console.log('\n========================================');
  console.log('        ✓ DEPLOYMENT COMPLETE!');
  console.log('========================================\n');

  console.log('📝 Contract Addresses (Polygon Mainnet):');
  console.log('-------------------------------------------');
  console.log('Vault:            ', vaultAddress);
  console.log('Referral:         ', referralAddress);
  console.log('Config:           ', configAddress);
  console.log('FeeDistributor:   ', feeDistributorAddress);
  console.log('AaveV3Strategy:     ', aaveV3StrategyAddress);
  console.log('QuickSwapV3Strategy:', quickswapV3StrategyAddress);
  console.log('-------------------------------------------');
  console.log('\nOwner:', ADMIN);
  console.log('USDT (Official):', USDT_ADDRESS);
  console.log('Chain ID: 137 (Polygon Mainnet)');

  // Save to .env
  const envPath = path.join(__dirname, '..', '.env');
  
  // Read existing .env if exists
  let existingEnv = '';
  if (fs.existsSync(envPath)) {
    existingEnv = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remove old deployment addresses if they exist
  const lines = existingEnv.split('\n').filter(line => 
    !line.startsWith('NEXT_PUBLIC_VAULT_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_REFERRAL_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_CONFIG_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_USDT_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_CHAIN_ID=') &&
    !line.startsWith('NEXT_PUBLIC_AAVE_STRATEGY_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_QUICKSWAP_STRATEGY_ADDRESS=')
  );
  
  const newEnvContent = lines.join('\n').trim() + `
    
# Deployed Contract Addresses - Polygon Mainnet
NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}
NEXT_PUBLIC_REFERRAL_ADDRESS=${referralAddress}
NEXT_PUBLIC_CONFIG_ADDRESS=${configAddress}
NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=${feeDistributorAddress}
NEXT_PUBLIC_USDT_ADDRESS=${USDT_ADDRESS}
NEXT_PUBLIC_AAVE_STRATEGY_ADDRESS=${aaveV3StrategyAddress}
NEXT_PUBLIC_QUICKSWAP_STRATEGY_ADDRESS=${quickswapV3StrategyAddress}
NEXT_PUBLIC_CHAIN_ID=137
`;
  
  fs.writeFileSync(envPath, newEnvContent);
  console.log('\n✓ Addresses saved to .env\n');

  // Save deployment info
  const deploymentInfo = {
    network: 'polygon-mainnet',
    chainId: 137,
    deployer: ADMIN,
    timestamp: new Date().toISOString(),
    contracts: {
      vault: vaultAddress,
      referral: referralAddress,
      config: configAddress,
      feeDistributor: feeDistributorAddress,
      aaveV3Strategy: aaveV3StrategyAddress,
      quickswapV3Strategy: quickswapV3StrategyAddress,
      usdt: USDT_ADDRESS
    },
    fees: {
      performanceFeeBP: 2000, // 20%
      depositFeeBP: 500,      // 5%
      managementFeeBP: 200    // 2%
    },
    referralRates: {
      level1: 4000, // 40%
      level2: 2500, // 25%
      level3: 1500, // 15%
      level4: 1200, // 12%
      level5: 800   // 8%
    },
    strategyAllocations: {
      aave: 5000,      // 50%
      quickswap: 5000  // 50%
    }
  };
  
  const deploymentPath = path.join(__dirname, '..', 'deployment-polygon.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('✓ Deployment info saved to deployment-polygon.json\n');
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
