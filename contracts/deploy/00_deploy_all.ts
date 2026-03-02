import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Configuration
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
  const ADMIN = process.env.ADMIN_ADDRESS || deployer.address;

  // Polygon Mainnet addresses
  const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
  const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
  const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c383969347A9Ea31E71";

  console.log("\n=== Deploying Core Contracts ===\n");

  // 1. Deploy Config
  console.log("Deploying Config...");
  const Config = await ethers.getContractFactory("Config");
  const config = await Config.deploy();
  await config.waitForDeployment();
  const configAddress = await config.getAddress();
  console.log("Config deployed to:", configAddress);

  // Initialize Config
  const initTx = await config.initialize(ADMIN, TREASURY, USDT_ADDRESS);
  await initTx.wait();
  console.log("Config initialized");

  // 2. Deploy FeeDistributor
  console.log("\nDeploying FeeDistributor...");
  const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
  const feeDistributor = await FeeDistributor.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await feeDistributor.waitForDeployment();
  const feeDistributorAddress = await feeDistributor.getAddress();
  console.log("FeeDistributor deployed to:", feeDistributorAddress);

  // 3. Deploy Referral
  console.log("\nDeploying Referral...");
  const Referral = await ethers.getContractFactory("Referral");
  const referral = await Referral.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await referral.waitForDeployment();
  const referralAddress = await referral.getAddress();
  console.log("Referral deployed to:", referralAddress);

  // Set FeeDistributor on Referral
  await referral.setFeeDistributor(feeDistributorAddress);
  console.log("FeeDistributor set on Referral");

  // 4. Deploy Vault
  console.log("\nDeploying Vault...");
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(USDT_ADDRESS, configAddress, ADMIN);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("Vault deployed to:", vaultAddress);

  // Set contracts on Vault
  await vault.setReferralContract(referralAddress);
  await vault.setFeeDistributor(feeDistributorAddress);
  console.log("Contracts linked to Vault");

  // 5. Setup Roles
  console.log("\n=== Setting up Roles ===\n");

  // Grant roles
  await feeDistributor.grantVaultRole(vaultAddress);
  await feeDistributor.grantReferralRole(referralAddress);
  await referral.grantVaultRole(vaultAddress);
  console.log("Roles granted");

  // 6. Update Config
  console.log("\n=== Updating Config ===\n");

  await config.setVault(vaultAddress);
  await config.setReferralContract(referralAddress);
  await config.setFeeDistributor(feeDistributorAddress);
  await config.setTreasury(TREASURY);
  console.log("Config updated with contract addresses");

  // 7. Deploy Strategies (Optional - for demonstration)
  console.log("\n=== Deploying Strategies ===\n");

  // Note: For mainnet deployment, you would deploy actual strategies
  // For now, we'll just show the pattern

  console.log("\n=== Deployment Summary ===\n");
  console.log("Config:", configAddress);
  console.log("Vault:", vaultAddress);
  console.log("Referral:", referralAddress);
  console.log("FeeDistributor:", feeDistributorAddress);
  console.log("Treasury:", TREASURY);
  console.log("USDT:", USDT_ADDRESS);

  console.log("\n=== Post-Deployment Checklist ===");
  console.log("1. Verify all contracts on Polygonscan");
  console.log("2. Transfer admin role to multisig");
  console.log("3. Deploy and add strategies");
  console.log("4. Test with small amounts first");
  console.log("5. Setup monitoring and bots");

  // Return addresses for verification
  return {
    config: configAddress,
    vault: vaultAddress,
    referral: referralAddress,
    feeDistributor: feeDistributorAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
