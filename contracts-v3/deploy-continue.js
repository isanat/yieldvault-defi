/**
 * Continue Deploy - Strategies
 * StrategyControllerV3 already deployed: 0x1a321f28A6f0851c566589E0303dd883a082A9F6
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const ADDRESSES = {
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  AAVE_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  AAVE_DATA_PROVIDER: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  A_USDT: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
  QUICKSWAP_POSITION_MANAGER: '0x8EF88e4c6cdAc15B562477E81289BBE046336506',
  QUICKSWAP_USDT_USDC_POOL: '0x7a5F0678C6069E66ea84Cc86B27b620bAF100c13',
  VAULT: '0x0E8F1358e12BB30C59124B5c4288F50ddBB75bff',
  CONTROLLER: '0x1a321f28A6f0851c566589E0303dd883a082A9F6',
};

async function main() {
  console.log('==============================================');
  console.log('Continue Strategy Deployment');
  console.log('==============================================\n');

  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL || 'https://polygon-bor.publicnode.com';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC\n');

  const getArtifact = (folder, name) => {
    const artifactPath = `./artifacts/contracts/${folder}/${name}.sol/${name}.json`;
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  };

  const deployedContracts = {
    strategyController: ADDRESSES.CONTROLLER,
    aaveLoopStrategy: '0xd8E97004c1E8EfbbFbEd3d234807b000E12ED5B3',
  };

  try {
    // 1. AaveLoopStrategyV3 already deployed
    console.log('1. AaveLoopStrategyV3 already deployed:', deployedContracts.aaveLoopStrategy);

    // Get existing contract instance
    const aaveArtifact = getArtifact('strategies', 'AaveLoopStrategyV3');
    const aaveStrategy = new ethers.Contract(
      deployedContracts.aaveLoopStrategy,
      aaveArtifact.abi,
      wallet
    );

    // 2. Deploy StableLpStrategyV3
    console.log('2. Deploying StableLpStrategyV3...');
    const lpArtifact = getArtifact('strategies', 'StableLpStrategyV3');
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

    // 3. Configure strategies
    console.log('3. Configuring strategies...');

    // Set controller on strategies
    let tx = await aaveStrategy.setController(deployedContracts.strategyController);
    await tx.wait();
    console.log('   AaveLoopStrategy controller set');

    tx = await lpStrategy.setController(deployedContracts.strategyController);
    await tx.wait();
    console.log('   StableLpStrategy controller set');

    // 4. Add strategies to controller
    console.log('4. Adding strategies to controller...');
    const controllerArtifact = getArtifact('strategies', 'StrategyControllerV3');
    const controller = new ethers.Contract(
      deployedContracts.strategyController,
      controllerArtifact.abi,
      wallet
    );

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
