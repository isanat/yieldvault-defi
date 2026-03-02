-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "referrerId" TEXT,
    "totalDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedTermsAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tvl" DOUBLE PRECISION NOT NULL,
    "totalShares" DOUBLE PRECISION NOT NULL,
    "sharePrice" DOUBLE PRECISION NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "dailyProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyApy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strategyAllocations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestEvent" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalProfit" DOUBLE PRECISION NOT NULL,
    "performanceFee" DOUBLE PRECISION NOT NULL,
    "netProfit" DOUBLE PRECISION NOT NULL,
    "strategyProfits" TEXT,
    "gasUsed" INTEGER,
    "gasPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HarvestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "sharePrice" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referrerAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "sharePrice" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "blockNumber" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCommission" (
    "id" TEXT NOT NULL,
    "txHash" TEXT,
    "userId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "level" INTEGER NOT NULL,
    "commissionType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "claimedAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "activeReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalReferredVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCommissions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "level1Count" INTEGER NOT NULL DEFAULT 0,
    "level2Count" INTEGER NOT NULL DEFAULT 0,
    "level3Count" INTEGER NOT NULL DEFAULT 0,
    "level4Count" INTEGER NOT NULL DEFAULT 0,
    "level5Count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminAddress" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "txHash" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allocation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastHarvestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategySnapshot" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tvl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotExecution" (
    "id" TEXT NOT NULL,
    "botName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "gasUsed" INTEGER,
    "error" TEXT,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE INDEX "User_address_idx" ON "User"("address");

-- CreateIndex
CREATE INDEX "User_referrerId_idx" ON "User"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultSnapshot_date_key" ON "VaultSnapshot"("date");

-- CreateIndex
CREATE INDEX "VaultSnapshot_date_idx" ON "VaultSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HarvestEvent_txHash_key" ON "HarvestEvent"("txHash");

-- CreateIndex
CREATE INDEX "HarvestEvent_timestamp_idx" ON "HarvestEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_txHash_key" ON "Deposit"("txHash");

-- CreateIndex
CREATE INDEX "Deposit_userId_idx" ON "Deposit"("userId");

-- CreateIndex
CREATE INDEX "Deposit_timestamp_idx" ON "Deposit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_txHash_key" ON "Withdrawal"("txHash");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_idx" ON "Withdrawal"("userId");

-- CreateIndex
CREATE INDEX "Withdrawal_timestamp_idx" ON "Withdrawal"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_timestamp_idx" ON "Transaction"("timestamp");

-- CreateIndex
CREATE INDEX "ReferralCommission_userId_idx" ON "ReferralCommission"("userId");

-- CreateIndex
CREATE INDEX "ReferralCommission_fromUserId_idx" ON "ReferralCommission"("fromUserId");

-- CreateIndex
CREATE INDEX "ReferralCommission_commissionType_idx" ON "ReferralCommission"("commissionType");

-- CreateIndex
CREATE INDEX "ReferralSnapshot_userId_idx" ON "ReferralSnapshot"("userId");

-- CreateIndex
CREATE INDEX "ReferralSnapshot_date_idx" ON "ReferralSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralSnapshot_userId_date_key" ON "ReferralSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "AdminLog_adminAddress_idx" ON "AdminLog"("adminAddress");

-- CreateIndex
CREATE INDEX "AdminLog_timestamp_idx" ON "AdminLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_address_key" ON "Strategy"("address");

-- CreateIndex
CREATE INDEX "Strategy_address_idx" ON "Strategy"("address");

-- CreateIndex
CREATE INDEX "StrategySnapshot_strategyId_idx" ON "StrategySnapshot"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategySnapshot_strategyId_date_key" ON "StrategySnapshot"("strategyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "BotExecution_botName_idx" ON "BotExecution"("botName");

-- CreateIndex
CREATE INDEX "BotExecution_timestamp_idx" ON "BotExecution"("timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralSnapshot" ADD CONSTRAINT "ReferralSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategySnapshot" ADD CONSTRAINT "StrategySnapshot_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
