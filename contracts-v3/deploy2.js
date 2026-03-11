const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuração
const PRIVATE_KEY = '7149ca6e12e753d80c712e1e0382fdf7d1d6bb98c8ad9bbea6b87c2bca8d4a86';
const RPC_URL = 'https://polygon.api.onfinality.io/public';
const OWNER_ADDRESS = '0xc7284fEc59a599C49889DD8532b4de7Db81b0340';
const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

// Already deployed
const CONFIG_V3 = '0xc7Ab7cE286906B21410201322EdC34faD144a661';

const logFile = '/home/z/my-project/contracts-v3/deploy-log.txt';

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function main() {
  fs.writeFileSync(logFile, '');
  
  log('=== YIELDVAULT V3 DEPLOY ===');
  log('Time: ' + new Date().toISOString());
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  log('RPC: ' + RPC_URL);
  const blockNumber = await provider.getBlockNumber();
  log('Block: ' + blockNumber);
  log('Deployer: ' + wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  log('Balance: ' + ethers.formatEther(balance) + ' MATIC');
  
  const pendingNonce = await provider.getTransactionCount(wallet.address, 'pending');
  const latestNonce = await provider.getTransactionCount(wallet.address, 'latest');
  log('Latest nonce: ' + latestNonce);
  log('Pending nonce: ' + pendingNonce);
  
  if (pendingNonce > latestNonce) {
    log('WARNING: ' + (pendingNonce - latestNonce) + ' pending txs detected!');
    log('Attempting to cancel pending transactions...');
    
    const feeData = await provider.getFeeData();
    const cancelGasPrice = feeData.gasPrice * 15n / 10n;
    log('Cancel gas price: ' + ethers.formatUnits(cancelGasPrice, 'gwei') + ' gwei');
    
    for (let nonce = latestNonce; nonce < pendingNonce; nonce++) {
      log('Canceling nonce ' + nonce + '...');
      try {
        const cancelTx = await wallet.sendTransaction({
          to: wallet.address,
          value: 0,
          gasLimit: 21000,
          gasPrice: cancelGasPrice,
          nonce: nonce
        });
        log('Cancel tx: ' + cancelTx.hash);
        await cancelTx.wait();
        log('Canceled nonce ' + nonce);
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        log('Error canceling nonce ' + nonce + ': ' + e.message);
      }
    }
  }
  
  let nonce = await provider.getTransactionCount(wallet.address, 'pending');
  log('Starting nonce: ' + nonce);
  
  // Load artifacts
  const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');
  
  const referralArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'ReferralV3.sol', 'ReferralV3.json'), 'utf8'));
  const feeDistributorArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'FeeDistributorV3.sol', 'FeeDistributorV3.json'), 'utf8'));
  const localStrategyManagerArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'LocalStrategyManagerV3.sol', 'LocalStrategyManagerV3.json'), 'utf8'));
  const vaultArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'YieldVaultV3.sol', 'YieldVaultV3.json'), 'utf8'));

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice * 12n / 10n;
  log('Gas price: ' + ethers.formatUnits(gasPrice, 'gwei') + ' gwei');
  
  const gasOptions = { gasPrice, gasLimit: 5000000 };

  // Deploy ReferralV3
  log('');
  log('[1/4] Deploying ReferralV3...');
  const ReferralFactory = new ethers.ContractFactory(referralArtifact.abi, referralArtifact.bytecode, wallet);
  const referralDeployTx = await ReferralFactory.getDeployTransaction(OWNER_ADDRESS, { ...gasOptions, nonce: nonce++ });
  const referralSent = await wallet.sendTransaction(referralDeployTx);
  log('ReferralV3 tx: ' + referralSent.hash);
  const referralResult = await referralSent.wait();
  const referralAddr = referralResult.contractAddress;
  log('ReferralV3: ' + referralAddr);

  // Deploy FeeDistributorV3
  log('');
  log('[2/4] Deploying FeeDistributorV3...');
  const FeeDistributorFactory = new ethers.ContractFactory(feeDistributorArtifact.abi, feeDistributorArtifact.bytecode, wallet);
  const feeDistributorDeployTx = await FeeDistributorFactory.getDeployTransaction(OWNER_ADDRESS, OWNER_ADDRESS, { ...gasOptions, nonce: nonce++ });
  const feeDistributorSent = await wallet.sendTransaction(feeDistributorDeployTx);
  log('FeeDistributorV3 tx: ' + feeDistributorSent.hash);
  const feeDistributorResult = await feeDistributorSent.wait();
  const feeDistributorAddr = feeDistributorResult.contractAddress;
  log('FeeDistributorV3: ' + feeDistributorAddr);

  // Deploy LocalStrategyManagerV3
  log('');
  log('[3/4] Deploying LocalStrategyManagerV3...');
  const LocalStrategyManagerFactory = new ethers.ContractFactory(localStrategyManagerArtifact.abi, localStrategyManagerArtifact.bytecode, wallet);
  const localStrategyManagerDeployTx = await LocalStrategyManagerFactory.getDeployTransaction(
    USDT_ADDRESS, OWNER_ADDRESS, referralAddr, feeDistributorAddr, { ...gasOptions, nonce: nonce++ }
  );
  const localStrategyManagerSent = await wallet.sendTransaction(localStrategyManagerDeployTx);
  log('LocalStrategyManagerV3 tx: ' + localStrategyManagerSent.hash);
  const localStrategyManagerResult = await localStrategyManagerSent.wait();
  const localStrategyManagerAddr = localStrategyManagerResult.contractAddress;
  log('LocalStrategyManagerV3: ' + localStrategyManagerAddr);

  // Deploy YieldVaultV3
  log('');
  log('[4/4] Deploying YieldVaultV3...');
  const VaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, wallet);
  const vaultDeployTx = await VaultFactory.getDeployTransaction(
    USDT_ADDRESS, OWNER_ADDRESS, 'YieldVault Share V3', 'yvUSDT-V3', { ...gasOptions, nonce: nonce++ }
  );
  const vaultSent = await wallet.sendTransaction(vaultDeployTx);
  log('YieldVaultV3 tx: ' + vaultSent.hash);
  const vaultResult = await vaultSent.wait();
  const vaultAddr = vaultResult.contractAddress;
  log('YieldVaultV3: ' + vaultAddr);

  log('');
  log('========== DEPLOY COMPLETED ==========');
  log('ConfigV3:              ' + CONFIG_V3);
  log('ReferralV3:            ' + referralAddr);
  log('FeeDistributorV3:      ' + feeDistributorAddr);
  log('LocalStrategyManagerV3: ' + localStrategyManagerAddr);
  log('YieldVaultV3:          ' + vaultAddr);
  log('');
  log('Polygonscan:');
  log('https://polygonscan.com/address/' + CONFIG_V3);
  log('https://polygonscan.com/address/' + referralAddr);
}

main().then(() => {
  log('Done!');
  process.exit(0);
}).catch(err => {
  log('ERROR: ' + err.message);
  process.exit(1);
});
