const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

async function main() {
  // Configuration
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  // Polygon Amoy testnet
  const RPC_URL = "https://rpc-amoy.polygon.technology";
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x701cb85ef71F42C2ce4839f16EdBAB1bB72E51bd";

  if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not set in .env file");
    process.exit(1);
  }

  console.log("========================================");
  console.log("  YieldVault DeFi - Polygon Amoy Deploy");
  console.log("========================================\n");

  // Connect to network
  console.log("Connecting to Polygon Amoy testnet...");
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Get current gas price
  const gasPrice = await provider.getGasPrice();
  console.log("Current gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
  
  // Increase gas price by 20%
  const adjustedGasPrice = gasPrice.mul(120).div(100);
  console.log("Adjusted gas price:", ethers.utils.formatUnits(adjustedGasPrice, "gwei"), "gwei");
  
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const deployerAddress = wallet.address;

  console.log("Deployer:", deployerAddress);

  try {
    const balance = await provider.getBalance(deployerAddress);
    console.log("Balance:", ethers.utils.formatEther(balance), "MATIC");

    if (balance.lt(ethers.utils.parseEther("0.01"))) {
      console.log("\n⚠️  Low balance! Get free MATIC from:");
      console.log("   https://faucet.polygon.technology/");
      console.log("   https://www.alchemy.com/faucets/polygon-amoy");
      process.exit(1);
    }
  } catch (e) {
    console.log("⚠️  Cannot check balance:", e.message);
    process.exit(1);
  }

  const owner = deployerAddress;
  const treasury = deployerAddress;

  console.log("\nConfiguration:");
  console.log("- Owner:", owner);
  console.log("- Treasury:", treasury);
  console.log("- USDT:", USDT_ADDRESS);
  console.log("");

  // Deployment options with higher gas
  const deployOptions = {
    gasPrice: adjustedGasPrice,
    gasLimit: 5000000
  };

  console.log("=== Deploying Contracts ===\n");

  // Load artifacts
  const configArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/core/Config.sol/Config.json", "utf8"));
  const referralArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/core/Referral.sol/Referral.json", "utf8"));
  const feeDistributorArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/core/FeeDistributor.sol/FeeDistributor.json", "utf8"));
  const vaultArtifact = JSON.parse(fs.readFileSync("./artifacts/contracts/core/Vault.sol/Vault.json", "utf8"));

  // 1. Deploy Config
  console.log("1. Deploying Config...");
  const ConfigFactory = new ethers.ContractFactory(configArtifact.abi, configArtifact.bytecode, wallet);
  const config = await ConfigFactory.deploy(owner, treasury, USDT_ADDRESS, deployOptions);
  await config.deployed();
  const configAddress = config.address;
  console.log("   ✓ Config:", configAddress);

  // 2. Deploy FeeDistributor
  console.log("\n2. Deploying FeeDistributor...");
  const FeeDistributorFactory = new ethers.ContractFactory(feeDistributorArtifact.abi, feeDistributorArtifact.bytecode, wallet);
  const feeDistributor = await FeeDistributorFactory.deploy(configAddress, USDT_ADDRESS, owner, deployOptions);
  await feeDistributor.deployed();
  const feeDistributorAddress = feeDistributor.address;
  console.log("   ✓ FeeDistributor:", feeDistributorAddress);

  // 3. Deploy Referral
  console.log("\n3. Deploying Referral...");
  const ReferralFactory = new ethers.ContractFactory(referralArtifact.abi, referralArtifact.bytecode, wallet);
  const referral = await ReferralFactory.deploy(configAddress, USDT_ADDRESS, owner, deployOptions);
  await referral.deployed();
  const referralAddress = referral.address;
  console.log("   ✓ Referral:", referralAddress);

  // Set FeeDistributor on Referral
  console.log("\n4. Linking FeeDistributor to Referral...");
  await (await referral.setFeeDistributor(feeDistributorAddress, { ...deployOptions, gasLimit: 200000 })).wait();
  console.log("   ✓ FeeDistributor linked");

  // 4. Deploy Vault
  console.log("\n5. Deploying Vault...");
  const VaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, wallet);
  const vault = await VaultFactory.deploy(USDT_ADDRESS, configAddress, owner, deployOptions);
  await vault.deployed();
  const vaultAddress = vault.address;
  console.log("   ✓ Vault:", vaultAddress);

  // Link contracts
  console.log("\n6. Linking contracts to Vault...");
  await (await vault.setReferralContract(referralAddress, { ...deployOptions, gasLimit: 200000 })).wait();
  await (await vault.setFeeDistributor(feeDistributorAddress, { ...deployOptions, gasLimit: 200000 })).wait();
  console.log("   ✓ Contracts linked");

  // Setup roles
  console.log("\n7. Setting up roles...");
  await (await feeDistributor.grantVaultRole(vaultAddress, { ...deployOptions, gasLimit: 200000 })).wait();
  await (await feeDistributor.grantReferralRole(referralAddress, { ...deployOptions, gasLimit: 200000 })).wait();
  console.log("   ✓ Roles configured");

  // Update config
  console.log("\n8. Updating config...");
  await (await config.setVault(vaultAddress, { ...deployOptions, gasLimit: 200000 })).wait();
  await (await config.setReferralContract(referralAddress, { ...deployOptions, gasLimit: 200000 })).wait();
  await (await config.setFeeDistributor(feeDistributorAddress, { ...deployOptions, gasLimit: 200000 })).wait();
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
  console.log("USDT:           ", USDT_ADDRESS);
  console.log("-------------------------------------------");
  console.log("\nOwner:", owner);
  console.log("");

  // Save to .env
  const envContent = `

# Deployed Contract Addresses - Polygon Amoy Testnet
NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}
NEXT_PUBLIC_REFERRAL_ADDRESS=${referralAddress}
NEXT_PUBLIC_CONFIG_ADDRESS=${configAddress}
NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS=${feeDistributorAddress}
NEXT_PUBLIC_USDT_ADDRESS=${USDT_ADDRESS}
NEXT_PUBLIC_CHAIN_ID=80002
`;
  fs.appendFileSync('../.env', envContent);
  console.log("✓ Addresses saved to .env\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.error?.data?.message) console.error("Details:", error.error.data.message);
    process.exit(1);
  });
