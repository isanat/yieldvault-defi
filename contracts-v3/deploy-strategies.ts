/**
 * Deploy Script for YieldVault V3 Strategies
 * 
 * Deploys:
 * 1. StrategyControllerV3
 * 2. AaveLoopStrategyV3
 * 3. StableLpStrategyV3
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env from contracts-v3 directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Polygon Mainnet Addresses
const ADDRESSES = {
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  AAVE_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  AAVE_DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  A_USDT: '0x23878914EFE38d27c4D67Ab83ed1b93A74D4086a',
  QUICKSWAP_POSITION_MANAGER: '0x8eF88E4c6CDAc15b562477E81289BbE046336506',
  QUICKSWAP_USDT_USDC_POOL: '0x7A5F0678c6069e66Ea84CC86b27B620BAf100c13',
  VAULT: '0x0E8F1358e12BB30C59124B5c4288F50ddBB75bff',
};

async function main() {
  console.log('==============================================');
  console.log('YieldVault V3 Strategy Deployment');
  console.log('==============================================\n');

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('ERROR: PRIVATE_KEY not found');
    process.exit(1);
  }

  const rpcUrl = process.env.RPC_URL || 'https://polygon-bor.publicnode.com';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deployer:', wallet.address);
  console.log('Network: Polygon Mainnet (137)');

  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC\n');

  if (balance < ethers.parseEther('0.5')) {
    console.warn('WARNING: Balance too low for deployment');
    process.exit(1);
  }

  // Get compiled artifacts
  const getArtifact = (name: string) => {
    const path = `./artifacts/contracts/strategies/${name}.sol/${name}.json`;
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  };

  const deployedContracts: Record<string, string> = {};

  try {
    // 1. Deploy StrategyControllerV3
    console.log('1. Deploying StrategyControllerV3...');
    const controllerArtifact = getArtifact('StrategyControllerV3');
    const ControllerFactory = new ethers.ContractFactory(
      controllerArtifact.abi,
      controllerArtifact.bytecode,
      wallet
    );

    const controller = await ControllerFactory.deploy(
      ADDRESSES.USDT,
      ADDRESSES.VAULT,
      wallet.address
    );
    await controller.waitForDeployment();
    deployedContracts.strategyController = await controller.getAddress();
    console.log('   StrategyControllerV3:', deployedContracts.strategyController, '\n');

    // 2. Deploy AaveLoopStrategyV3
    console.log('2. Deploying AaveLoopStrategyV3...');
    const aaveArtifact = getArtifact('AaveLoopStrategyV3');
    const AaveFactory = new ethers.ContractFactory(
      aaveArtifact.abi,
      aaveArtifact.bytecode,
      wallet
    );

    const aaveStrategy = await AaveFactory.deploy(
      ADDRESSES.VAULT,
      ADDRESSES.USDT,
      ADDRESSES.USDC,
      ADDRESSES.AAVE_POOL,
      ADDRESSES.AAVE_DATA_PROVIDER,
      ADDRESSES.A_USDT,
      wallet.address
    );
    await aaveStrategy.waitForDeployment();
    deployedContracts.aaveLoopStrategy = await aaveStrategy.getAddress();
    console.log('   AaveLoopStrategyV3:', deployedContracts.aaveLoopStrategy, '\n');

    // 3. Deploy StableLpStrategyV3
    console.log('3. Deploying StableLpStrategyV3...');
    const lpArtifact = getArtifact('StableLpStrategyV3');
    const LpFactory = new ethers.ContractFactory(
      lpArtifact.abi,
      lpArtifact.bytecode,
      wallet
    );

    const lpStrategy = await LpFactory.deploy(
      ADDRESSES.VAULT,
      ADDRESSES.USDT,
      ADDRESSES.USDC,
      ADDRESSES.AAVE_POOL,
      ADDRESSES.AAVE_DATA_PROVIDER,
      ADDRESSES.A_USDT,
      ADDRESSES.QUICKSWAP_POSITION_MANAGER,
      ADDRESSES.QUICKSWAP_USDT_USDC_POOL,
      wallet.address
    );
    await lpStrategy.waitForDeployment();
    deployedContracts.stableLpStrategy = await lpStrategy.getAddress();
    console.log('   StableLpStrategyV3:', deployedContracts.stableLpStrategy, '\n');

    // 4. Configure strategies
    console.log('4. Configuring strategies...');

    // Set controller on strategies
    let tx = await aaveStrategy.setController(deployedContracts.strategyController);
    await tx.wait();
    console.log('   AaveLoopStrategy controller set');

    tx = await lpStrategy.setController(deployedContracts.strategyController);
    await tx.wait();
    console.log('   StableLpStrategy controller set');

    // Add strategies to controller
    tx = await controller.addStrategy(deployedContracts.aaveLoopStrategy, 5000);
    await tx.wait();
    console.log('   AaveLoopStrategy added (50% allocation)');

    tx = await controller.addStrategy(deployedContracts.stableLpStrategy, 5000);
    await tx.wait();
    console.log('   StableLpStrategy added (50% allocation)');

    console.log('\n==============================================');
    console.log('Deployment Complete!');
    console.log('==============================================\n');

    // Save deployed addresses
    const deploymentData = {
      deployedAt: new Date().toISOString(),
      chainId: 137,
      network: 'polygon-mainnet',
      owner: wallet.address,
      ...deployedContracts,
      vault: ADDRESSES.VAULT,
      usdt: ADDRESSES.USDT,
    };

    fs.writeFileSync(
      './deployed-strategies.json',
      JSON.stringify(deploymentData, null, 2)
    );
    console.log('Saved to deployed-strategies.json\n');

    Object.entries(deployedContracts).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });

  } catch (error) {
    console.error('\nDeployment failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
