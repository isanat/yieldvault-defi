import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Config, Vault, Referral, FeeDistributor, MockUSDT, MockStrategy } from "../typechain-types";

describe("Vault System", function () {
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let treasury: SignerWithAddress;

  let usdt: MockUSDT;
  let config: Config;
  let vault: Vault;
  let referral: Referral;
  let feeDistributor: FeeDistributor;
  let strategy: MockStrategy;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDT
  const DEPOSIT_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDT

  beforeEach(async function () {
    [admin, user1, user2, user3, treasury] = await ethers.getSigners();

    // Deploy Mock USDT
    const MockUSDTFactory = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDTFactory.deploy();
    await usdt.waitForDeployment();

    // Mint tokens to users
    await usdt.mint(user1.address, INITIAL_SUPPLY);
    await usdt.mint(user2.address, INITIAL_SUPPLY);
    await usdt.mint(user3.address, INITIAL_SUPPLY);

    // Deploy Config
    const ConfigFactory = await ethers.getContractFactory("Config");
    config = await ConfigFactory.deploy();
    await config.waitForDeployment();
    await config.initialize(admin.address, treasury.address, await usdt.getAddress());

    // Deploy FeeDistributor
    const FeeDistributorFactory = await ethers.getContractFactory("FeeDistributor");
    feeDistributor = await FeeDistributorFactory.deploy(
      await config.getAddress(),
      await usdt.getAddress(),
      admin.address
    );
    await feeDistributor.waitForDeployment();

    // Deploy Referral
    const ReferralFactory = await ethers.getContractFactory("Referral");
    referral = await ReferralFactory.deploy(
      await config.getAddress(),
      await usdt.getAddress(),
      admin.address
    );
    await referral.waitForDeployment();
    await referral.setFeeDistributor(await feeDistributor.getAddress());

    // Deploy Vault
    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy(
      await usdt.getAddress(),
      await config.getAddress(),
      admin.address
    );
    await vault.waitForDeployment();
    await vault.setReferralContract(await referral.getAddress());
    await vault.setFeeDistributor(await feeDistributor.getAddress());

    // Deploy Mock Strategy
    const MockStrategyFactory = await ethers.getContractFactory("MockStrategy");
    strategy = await MockStrategyFactory.deploy(
      await vault.getAddress(),
      await usdt.getAddress()
    );
    await strategy.waitForDeployment();

    // Setup roles
    await feeDistributor.grantVaultRole(await vault.getAddress());
    await feeDistributor.grantReferralRole(await referral.getAddress());
    await referral.grantVaultRole(await vault.getAddress());
    await vault.grantRole(await vault.STRATEGIST_ROLE(), admin.address);
    await strategy.grantVaultRole(await vault.getAddress());

    // Add strategy to vault
    await vault.addStrategy(await strategy.getAddress(), 10000); // 100% allocation

    // Update config with contract addresses
    await config.setVault(await vault.getAddress());
    await config.setReferralContract(await referral.getAddress());
    await config.setFeeDistributor(await feeDistributor.getAddress());
  });

  describe("Config", function () {
    it("should initialize with correct default values", async function () {
      expect(await config.performanceFeeBP()).to.equal(2000); // 20%
      expect(await config.depositFeeBP()).to.equal(500); // 5%
      expect(await config.managementFeeBP()).to.equal(200); // 2%
      expect(await config.depositsEnabled()).to.be.true;
      expect(await config.withdrawalsEnabled()).to.be.true;
    });

    it("should allow admin to toggle features", async function () {
      await config.setDepositsEnabled(false);
      expect(await config.depositsEnabled()).to.be.false;

      await config.emergencyPause();
      expect(await config.depositsEnabled()).to.be.false;
      expect(await config.withdrawalsEnabled()).to.be.false;
      expect(await config.harvestEnabled()).to.be.false;
    });
  });

  describe("Vault Deposits", function () {
    it("should accept deposits and mint shares", async function () {
      await usdt.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      
      const tx = await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address, ethers.ZeroAddress);
      await tx.wait();

      const shares = await vault.balanceOf(user1.address);
      expect(shares).to.be.gt(0);
      
      const userBalance = await vault.convertToAssets(shares);
      expect(userBalance).to.be.closeTo(DEPOSIT_AMOUNT, ethers.parseUnits("1", 6));
    });

    it("should register referrer on first deposit", async function () {
      await usdt.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address, ethers.ZeroAddress);

      // User2 deposits with user1 as referrer
      await usdt.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address, user1.address);

      const referrer = await referral.getReferrer(user2.address);
      expect(referrer).to.equal(user1.address);
    });

    it("should charge deposit fee", async function () {
      const depositFeeBP = await config.depositFeeBP(); // 5%
      const expectedFee = (DEPOSIT_AMOUNT * depositFeeBP) / 10000n;

      await usdt.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address, ethers.ZeroAddress);

      // Fee should be in feeDistributor
      const pendingFees = await feeDistributor.getPendingTreasuryFees();
      expect(pendingFees).to.be.closeTo(expectedFee, ethers.parseUnits("1", 4));
    });
  });

  describe("Referral System", function () {
    beforeEach(async function () {
      // User1 deposits (no referrer)
      await usdt.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address, ethers.ZeroAddress);
    });

    it("should track referral tree", async function () {
      // User2 deposits with user1 as referrer
      await usdt.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address, user1.address);

      // User3 deposits with user2 as referrer
      await usdt.connect(user3).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user3).deposit(DEPOSIT_AMOUNT, user3.address, user2.address);

      const referrer2 = await referral.getReferrer(user2.address);
      const referrer3 = await referral.getReferrer(user3.address);

      expect(referrer2).to.equal(user1.address);
      expect(referrer3).to.equal(user2.address);

      // Check referral count
      const stats1 = await referral.getReferralStats(user1.address);
      expect(stats1.totalReferrals).to.equal(1);
    });

    it("should distribute deposit commissions to referrers", async function () {
      // User2 deposits with user1 as referrer
      await usdt.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address, user1.address);

      const pendingCommission = await referral.getPendingCommissions(user1.address);
      expect(pendingCommission).to.be.gt(0);
    });

    it("should allow users to claim commissions", async function () {
      // Setup: user2 deposits with user1 as referrer
      await usdt.connect(user2).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user2).deposit(DEPOSIT_AMOUNT, user2.address, user1.address);

      const pendingBefore = await referral.getPendingCommissions(user1.address);
      expect(pendingBefore).to.be.gt(0);

      // Need to fund feeDistributor
      await usdt.mint(await feeDistributor.getAddress(), pendingBefore);

      // User1 claims
      await referral.connect(user1).claimCommissions();

      const pendingAfter = await referral.getPendingCommissions(user1.address);
      expect(pendingAfter).to.equal(0);
    });
  });

  describe("Vault Withdrawals", function () {
    beforeEach(async function () {
      await usdt.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address, ethers.ZeroAddress);
    });

    it("should allow withdrawal of deposited funds", async function () {
      const shares = await vault.balanceOf(user1.address);
      const assetsToWithdraw = await vault.convertToAssets(shares);

      const balanceBefore = await usdt.balanceOf(user1.address);
      
      await vault.connect(user1).withdraw(assetsToWithdraw, user1.address, user1.address);
      
      const balanceAfter = await usdt.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.be.closeTo(
        assetsToWithdraw, 
        ethers.parseUnits("10", 6) // Allow for some slippage/fees
      );
    });

    it("should burn shares on withdrawal", async function () {
      const sharesBefore = await vault.balanceOf(user1.address);
      const assetsToWithdraw = await vault.convertToAssets(sharesBefore);

      await vault.connect(user1).withdraw(assetsToWithdraw, user1.address, user1.address);

      const sharesAfter = await vault.balanceOf(user1.address);
      expect(sharesAfter).to.be.lt(sharesBefore);
    });
  });

  describe("Strategy Management", function () {
    it("should allow admin to add strategy", async function () {
      const MockStrategyFactory = await ethers.getContractFactory("MockStrategy");
      const newStrategy = await MockStrategyFactory.deploy(
        await vault.getAddress(),
        await usdt.getAddress()
      );

      await vault.addStrategy(await newStrategy.getAddress(), 0);
      
      const count = await vault.strategyCount();
      expect(count).to.equal(2);
    });

    it("should allow rebalancing strategies", async function () {
      // Deploy second strategy
      const MockStrategyFactory = await ethers.getContractFactory("MockStrategy");
      const strategy2 = await MockStrategyFactory.deploy(
        await vault.getAddress(),
        await usdt.getAddress()
      );
      await strategy2.grantVaultRole(await vault.getAddress());

      // Update allocation: 50% each
      await vault.addStrategy(await strategy2.getAddress(), 0);
      await vault.rebalanceStrategies([5000, 5000]);

      const allocations = await vault.getStrategies();
      expect(allocations[1][0]).to.equal(5000);
      expect(allocations[1][1]).to.equal(5000);
    });
  });

  describe("Harvest", function () {
    beforeEach(async function () {
      await usdt.connect(user1).approve(await vault.getAddress(), DEPOSIT_AMOUNT);
      await vault.connect(user1).deposit(DEPOSIT_AMOUNT, user1.address, ethers.ZeroAddress);
    });

    it("should allow strategist to harvest", async function () {
      // Simulate profit in strategy
      await usdt.mint(await strategy.getAddress(), ethers.parseUnits("100", 6));

      await vault.harvest();

      const totalHarvested = await vault.totalProfitHarvested();
      expect(totalHarvested).to.be.gt(0);
    });
  });
});
