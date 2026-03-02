import { ethers, JsonRpcProvider, Wallet, ContractFactory } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRIVATE_KEY = '0162e5338c2c8e71f70daff4a07c539e50a65d868407a041740ec60116e4df46';
// Using Amoy testnet (Mumbai is deprecated)
const AMOY_RPC = 'https://rpc-amoy.polygon.technology';
const USDT_ADDRESS = '0x0e1d9ecb896b85b2b0486e52e89f223773aec029'; // USDT on Amoy testnet (lowercase to avoid checksum issues)

// Load contract artifacts
function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'contracts', 'artifacts', 'contracts', 'core', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact;
}

async function main() {
  console.log('========================================');
  console.log('  YieldVault DeFi - Amoy Testnet Deploy');
  console.log('========================================\n');

  // Connect to Amoy
  const provider = new JsonRpcProvider(AMOY_RPC);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  
  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC\n');

  if (balance < ethers.parseEther('0.01')) {
    console.log('⚠️  Warning: Low balance. You need at least 0.01 MATIC for deployment.');
    console.log('Get free MATIC from: https://faucet.polygon.technology/');
    return;
  }

  const ADMIN = wallet.address;
  const TREASURY = wallet.address;

  console.log('Configuration:');
  console.log('- Admin:', ADMIN);
  console.log('- Treasury:', TREASURY);
  console.log('- USDT:', USDT_ADDRESS);
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

  console.log('   Linking FeeDistributor...');
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

  // 5. Setup Roles
  console.log('\n5. Setting up roles...');
  const grantVaultRoleTx = await feeDistributor.grantVaultRole(vaultAddress);
  await grantVaultRoleTx.wait();
  const grantReferralRoleTx = await feeDistributor.grantReferralRole(referralAddress);
  await grantReferralRoleTx.wait();
  const vaultRoleOnReferralTx = await referral.grantVaultRole(vaultAddress);
  await vaultRoleOnReferralTx.wait();
  console.log('   ✓ Roles configured');

  // 6. Update Config
  console.log('\n6. Updating config...');
  const setVaultTx = await config.setVault(vaultAddress);
  await setVaultTx.wait();
  const setReferralConfigTx = await config.setReferralContract(referralAddress);
  await setReferralConfigTx.wait();
  const setFeeConfigTx = await config.setFeeDistributor(feeDistributorAddress);
  await setFeeConfigTx.wait();
  console.log('   ✓ Config updated');

  // Summary
  console.log('\n========================================');
  console.log('        ✓ DEPLOYMENT COMPLETE!');
  console.log('========================================\n');

  console.log('📝 Contract Addresses:');
  console.log('-------------------------------------------');
  console.log('Vault:          ', vaultAddress);
  console.log('Referral:       ', referralAddress);
  console.log('Config:         ', configAddress);
  console.log('FeeDistributor: ', feeDistributorAddress);
  console.log('-------------------------------------------');
  console.log('\nOwner:', ADMIN);
  console.log('USDT:', USDT_ADDRESS);

  // Save to .env
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = `

# Deployed Contract Addresses - Amoy Testnet (Polygon)
NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}
NEXT_PUBLIC_REFERRAL_ADDRESS=${referralAddress}
NEXT_PUBLIC_CONFIG_ADDRESS=${configAddress}
NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=${feeDistributorAddress}
NEXT_PUBLIC_USDT_ADDRESS=${USDT_ADDRESS}
NEXT_PUBLIC_CHAIN_ID=80002
`;
  fs.appendFileSync(envPath, envContent);
  console.log('\n✓ Addresses saved to .env\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
