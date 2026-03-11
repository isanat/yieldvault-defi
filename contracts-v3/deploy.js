const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuração
const PRIVATE_KEY = '7149ca6e12e753d80c712e1e0382fdf7d1d6bb98c8ad9bbea6b87c2bca8d4a86';
const RPC_URLS = [
  'https://polygon.api.onfinality.io/public',
  'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
];
const OWNER_ADDRESS = '0xc7284fEc59a599C49889DD8532b4de7Db81b0340';
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

const logFile = '/home/z/my-project/contracts-v3/deploy-log.txt';

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function tryProvider(rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  try {
    const blockNumber = await provider.getBlockNumber();
    log('Connected to: ' + rpcUrl + ' (block: ' + blockNumber + ')');
    return provider;
  } catch (e) {
    log('Failed: ' + rpcUrl);
    return null;
  }
}

async function main() {
  fs.writeFileSync(logFile, '');
  
  log('=== YIELDVAULT V3 DEPLOY ===');
  log('Time: ' + new Date().toISOString());
  
  let provider = null;
  for (const rpc of RPC_URLS) {
    provider = await tryProvider(rpc);
    if (provider) break;
    await new Promise(r => setTimeout(r, 2000));
  }
  
  if (!provider) {
    log('ERROR: No working RPC');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  log('Deployer: ' + wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  log('Balance: ' + ethers.formatEther(balance) + ' MATIC');
  
  // Check nonce
  const pendingNonce = await provider.getTransactionCount(wallet.address, 'pending');
  const latestNonce = await provider.getTransactionCount(wallet.address, 'latest');
  log('Latest nonce: ' + latestNonce);
  log('Pending nonce: ' + pendingNonce);
  
  if (pendingNonce > latestNonce) {
    log('WARNING: ' + (pendingNonce - latestNonce) + ' pending txs - canceling...');
    
    const feeData = await provider.getFeeData();
    const cancelGasPrice = feeData.gasPrice * 15n / 10n;
    log('Cancel gas price: ' + ethers.formatUnits(cancelGasPrice, 'gwei') + ' gwei');
    
    for (let nonce = latestNonce; nonce < pendingNonce; nonce++) {
      log('Canceling nonce ' + nonce + '...');
      try {
        const tx = await wallet.sendTransaction({
          to: wallet.address,
          value: 0,
          gasLimit: 21000,
          gasPrice: cancelGasPrice,
          nonce: nonce
        });
        log('Cancel tx: ' + tx.hash);
        await tx.wait();
        log('Canceled nonce ' + nonce);
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        log('Error: ' + e.message);
      }
    }
  }

  // Load artifacts
  const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');
  
  const configArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'ConfigV3.sol', 'ConfigV3.json'), 'utf8'));
  const referralArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'ReferralV3.sol', 'ReferralV3.json'), 'utf8'));
  const feeDistributorArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'FeeDistributorV3.sol', 'FeeDistributorV3.json'), 'utf8'));
  const localStrategyManagerArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'LocalStrategyManagerV3.sol', 'LocalStrategyManagerV3.json'), 'utf8'));
  const vaultArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'YieldVaultV3.sol', 'YieldVaultV3.json'), 'utf8'));

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice * 12n / 10n;
  log('Gas price: ' + ethers.formatUnits(gasPrice, 'gwei') + ' gwei');
  
  const gasOptions = { gasPrice, gasLimit: 5000000 };
  let nonce = await provider.getTransactionCount(wallet.address, 'pending');

  // Deploy ConfigV3
  log('');
  log('[1/5] Deploying ConfigV3...');
  const ConfigFactory = new ethers.ContractFactory(configArtifact.abi, configArtifact.bytecode, wallet);
  const configTx = await ConfigFactory.getDeployTransaction(OWNER_ADDRESS, { ...gasOptions, nonce: nonce++ });
  const configReceipt = await wallet.sendTransaction(configTx);
  log('ConfigV3 tx: ' + configReceipt.hash);
  const configResult = await configReceipt.wait();
  const configAddr = configResult.contractAddress;
  log('ConfigV3: ' + configAddr);

  // Deploy ReferralV3
  log('');
  log('[2/5] Deploying ReferralV3...');
  const ReferralFactory = new ethers.ContractFactory(referralArtifact.abi, referralArtifact.bytecode, wallet);
  const referralTx = await ReferralFactory.getDeployTransaction(OWNER_ADDRESS, { ...gasOptions, nonce: nonce++ });
  const referralReceipt = await wallet.sendTransaction(referralTx);
  log('ReferralV3 tx: ' + referralReceipt.hash);
  const referralResult = await referralReceipt.wait();
  const referralAddr = referralResult.contractAddress;
  log('ReferralV3: ' + referralAddr);

  // Deploy FeeDistributorV3
  log('');
  log('[3/5] Deploying FeeDistributorV3...');
  const FeeDistributorFactory = new ethers.ContractFactory(feeDistributorArtifact.abi, feeDistributorArtifact.bytecode, wallet);
  const feeDistributorTx = await FeeDistributorFactory.getDeployTransaction(OWNER_ADDRESS, OWNER_ADDRESS, { ...gasOptions, nonce: nonce++ });
  const feeDistributorReceipt = await wallet.sendTransaction(feeDistributorTx);
  log('FeeDistributorV3 tx: ' + feeDistributorReceipt.hash);
  const feeDistributorResult = await feeDistributorReceipt.wait();
  const feeDistributorAddr = feeDistributorResult.contractAddress;
  log('FeeDistributorV3: ' + feeDistributorAddr);

  // Deploy LocalStrategyManagerV3
  log('');
  log('[4/5] Deploying LocalStrategyManagerV3...');
  const LocalStrategyManagerFactory = new ethers.ContractFactory(localStrategyManagerArtifact.abi, localStrategyManagerArtifact.bytecode, wallet);
  const localStrategyManagerTx = await LocalStrategyManagerFactory.getDeployTransaction(
    USDT_ADDRESS, OWNER_ADDRESS, referralAddr, feeDistributorAddr, { ...gasOptions, nonce: nonce++ }
  );
  const localStrategyManagerReceipt = await wallet.sendTransaction(localStrategyManagerTx);
  log('LocalStrategyManagerV3 tx: ' + localStrategyManagerReceipt.hash);
  const localStrategyManagerResult = await localStrategyManagerReceipt.wait();
  const localStrategyManagerAddr = localStrategyManagerResult.contractAddress;
  log('LocalStrategyManagerV3: ' + localStrategyManagerAddr);

  // Deploy YieldVaultV3
  log('');
  log('[5/5] Deploying YieldVaultV3...');
  const VaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, wallet);
  const vaultTx = await VaultFactory.getDeployTransaction(
    USDT_ADDRESS, OWNER_ADDRESS, 'YieldVault Share V3', 'yvUSDT-V3', { ...gasOptions, nonce: nonce++ }
  );
  const vaultReceipt = await wallet.sendTransaction(vaultTx);
  log('YieldVaultV3 tx: ' + vaultReceipt.hash);
  const vaultResult = await vaultReceipt.wait();
  const vaultAddr = vaultResult.contractAddress;
  log('YieldVaultV3: ' + vaultAddr);

  log('');
  log('========== DEPLOY COMPLETED ==========');
  log('ConfigV3:              ' + configAddr);
  log('ReferralV3:            ' + referralAddr);
  log('FeeDistributorV3:      ' + feeDistributorAddr);
  log('LocalStrategyManagerV3: ' + localStrategyManagerAddr);
  log('YieldVaultV3:          ' + vaultAddr);
  log('');
  log('View on Polygonscan:');
  log('https://polygonscan.com/address/' + configAddr);
}

main().then(() => {
  log('Done!');
  process.exit(0);
}).catch(err => {
  log('ERROR: ' + err.message);
  process.exit(1);
});
