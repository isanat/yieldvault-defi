const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("  YieldVault DeFi - Mumbai Testnet Deploy");
  console.log("========================================");
  console.log("");
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");
  console.log("");

  // All roles go to the deployer (user's wallet)
  const ADMIN = deployer.address;
  const TREASURY = deployer.address;
  
  // Mumbai Testnet USDT
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x701cb85ef71F42C2ce4839f16EdBAB1bB72E51bd";

  console.log("Configuration:");
  console.log("- Owner/Admin:", ADMIN);
  console.log("- Treasury:", TREASURY);
  console.log("- USDT:", USDT_ADDRESS);
  console.log("");

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance. You need at least 0.01 MATIC for deployment.");
    console.log("Get free MATIC from: https://faucet.polygon.technology/");
    return;
  }

  console.log("=== Deploying Core Contracts ===\n");

  // 1. Deploy Config
  console.log("1. Deploying Config...");
  const Config = await ethers.getContractFactory("Config");
  const config = await Config.deploy();
  await config.waitForDeployment();
  const configAddress = await config.getAddress();
  console.log("   ✓ Config:", configAddress);

  console.log("   Initializing...");
  await (await config.initialize(ADMIN, TREASURY, USDT_ADDRESS)).wait();
  console.log("   ✓ Config initialized");

  // 2. Deploy FeeDistributor
  console.log("\n2. Deploying FeeDistributor...");
  const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
  const feeDistributor = await FeeDistributor.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await feeDistributor.waitForDeployment();
  const feeDistributorAddress = await feeDistributor.getAddress();
  console.log("   ✓ FeeDistributor:", feeDistributorAddress);

  // 3. Deploy Referral
  console.log("\n3. Deploying Referral...");
  const Referral = await ethers.getContractFactory("Referral");
  const referral = await Referral.deploy(configAddress, USDT_ADDRESS, ADMIN);
  await referral.waitForDeployment();
  const referralAddress = await referral.getAddress();
  console.log("   ✓ Referral:", referralAddress);

  await (await referral.setFeeDistributor(feeDistributorAddress)).wait();
  console.log("   ✓ FeeDistributor linked");

  // 4. Deploy Vault
  console.log("\n4. Deploying Vault...");
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(USDT_ADDRESS, configAddress, ADMIN);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("   ✓ Vault:", vaultAddress);

  await (await vault.setReferralContract(referralAddress)).wait();
  await (await vault.setFeeDistributor(feeDistributorAddress)).wait();
  console.log("   ✓ Contracts linked to Vault");

  // 5. Setup Roles
  console.log("\n5. Setting up roles...");
  await (await feeDistributor.grantVaultRole(vaultAddress)).wait();
  await (await feeDistributor.grantReferralRole(referralAddress)).wait();
  await (await referral.grantVaultRole(vaultAddress)).wait();
  console.log("   ✓ Roles configured");

  // 6. Update Config
  console.log("\n6. Updating config...");
  await (await config.setVault(vaultAddress)).wait();
  await (await config.setReferralContract(referralAddress)).wait();
  await (await config.setFeeDistributor(feeDistributorAddress)).wait();
  console.log("   ✓ Config updated");

  // Summary
  console.log("\n========================================");
  console.log("        ✓ DEPLOYMENT COMPLETE!");
  console.log("========================================\n");
  
  console.log("📝 Contract Addresses:");
  console.log("-------------------------------------------");
  console.log("Vault:          ", vaultAddress);
  console.log("Referral:       ", referralAddress);
  console.log("Config:         ", configAddress);
  console.log("FeeDistributor: ", feeDistributorAddress);
  console.log("-------------------------------------------");
  console.log("\nOwner:", ADMIN);
  console.log("USDT:", USDT_ADDRESS);
  console.log("");

  // Save to .env
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
  console.log("✓ Addresses saved to .env\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
