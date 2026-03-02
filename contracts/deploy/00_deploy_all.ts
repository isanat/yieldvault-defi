import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("  YieldVault DeFi - Mumbai Testnet Deploy");
  console.log("========================================");
  console.log("");
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");
  console.log("");

  // Configuration - Mumbai Testnet
  const TREASURY = process.env.TREASURY_ADDRESS || process.env.ADMIN_ADDRESS || deployer.address;
  const ADMIN = process.env.ADMIN_ADDRESS || deployer.address;
  
  // Mumbai Testnet USDT (provided by user)
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x701cb85ef71F42C2ce4839f16EdBAB1bB72E51bd";

  console.log("Configuration:");
  console.log("- Admin/Owner:", ADMIN);
  console.log("- Treasury:", TREASURY);
  console.log("- USDT:", USDT_ADDRESS);
  console.log("");

  console.log("=== Deploying Core Contracts ===\n");

  // 1. Deploy Config
  console.log("1. Deploying Config...");
  const Config = await ethers.getContractFactory("Config");
  const config = await Config.deploy();
  await config.waitForDeployment();
  const configAddress = await config.getAddress();
  console.log("   Config deployed to:", configAddress);

  // Initialize Config
  console.log("   Initializing Config...");
  const initTx = await config.initialize(ADMIN, TREASURY, USDT_ADDRESS);
  await initTx.wait();
  console.log("   Config initialized");

  // 2. Deploy FeeDistributor
  console.log("\n2. Deploying FeeDistributor...");
  const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
  const feeDistributor = await FeeDistributor.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await feeDistributor.waitForDeployment();
  const feeDistributorAddress = await feeDistributor.getAddress();
  console.log("   FeeDistributor deployed to:", feeDistributorAddress);

  // 3. Deploy Referral
  console.log("\n3. Deploying Referral...");
  const Referral = await ethers.getContractFactory("Referral");
  const referral = await Referral.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await referral.waitForDeployment();
  const referralAddress = await referral.getAddress();
  console.log("   Referral deployed to:", referralAddress);

  // Set FeeDistributor on Referral
  console.log("   Setting FeeDistributor on Referral...");
  await referral.setFeeDistributor(feeDistributorAddress);
  console.log("   FeeDistributor set");

  // 4. Deploy Vault
  console.log("\n4. Deploying Vault...");
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(USDT_ADDRESS, configAddress, ADMIN);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("   Vault deployed to:", vaultAddress);

  // Set contracts on Vault
  console.log("   Linking contracts to Vault...");
  await vault.setReferralContract(referralAddress);
  await vault.setFeeDistributor(feeDistributorAddress);
  console.log("   Contracts linked");

  // 5. Setup Roles
  console.log("\n5. Setting up Roles...");
  await feeDistributor.grantVaultRole(vaultAddress);
  await feeDistributor.grantReferralRole(referralAddress);
  await referral.grantVaultRole(vaultAddress);
  console.log("   Roles granted");

  // 6. Update Config
  console.log("\n6. Updating Config with contract addresses...");
  await config.setVault(vaultAddress);
  await config.setReferralContract(referralAddress);
  await config.setFeeDistributor(feeDistributorAddress);
  await config.setTreasury(TREASURY);
  console.log("   Config updated");

  // Final Summary
  console.log("\n========================================");
  console.log("        DEPLOYMENT COMPLETE");
  console.log("========================================\n");
  
  console.log("Contract Addresses (save these!):");
  console.log("-------------------------------------------");
  console.log("VAULT_ADDRESS=" + vaultAddress);
  console.log("REFERRAL_ADDRESS=" + referralAddress);
  console.log("CONFIG_ADDRESS=" + configAddress);
  console.log("FEE_DISTRIBUTOR_ADDRESS=" + feeDistributorAddress);
  console.log("-------------------------------------------");
  console.log("");
  console.log("Owner/Admin:", ADMIN);
  console.log("Treasury:", TREASURY);
  console.log("USDT Token:", USDT_ADDRESS);
  console.log("");

  // Save to .env file for frontend
  const fs = await import('fs');
  const envContent = `
# Deployed Contract Addresses - Mumbai Testnet
NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}
NEXT_PUBLIC_REFERRAL_ADDRESS=${referralAddress}
NEXT_PUBLIC_CONFIG_ADDRESS=${configAddress}
NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=${feeDistributorAddress}
NEXT_PUBLIC_USDT_ADDRESS=${USDT_ADDRESS}
NEXT_PUBLIC_CHAIN_ID=80001
`;
  fs.appendFileSync('../.env', envContent);
  console.log("Addresses saved to .env file");

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
