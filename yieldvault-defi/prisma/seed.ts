import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create system configuration
  const configs = [
    { key: 'depositFee', value: '0.005' },
    { key: 'withdrawalFee', value: '0' },
    { key: 'performanceFee', value: '0.1' },
    { key: 'referralLevels', value: JSON.stringify([0.1, 0.05, 0.03, 0.02, 0.01]) },
    { key: 'minDeposit', value: '100' },
    { key: 'maxDeposit', value: '1000000' },
    { key: 'vaultAddress', value: '' },
    { key: 'referralAddress', value: '' },
    { key: 'configAddress', value: '' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log('✓ System config created');

  // Create strategies
  const strategies = [
    {
      address: '0x0000000000000000000000000000000000000001',
      name: 'Aave V3 Leverage',
      description: 'Leveraged lending strategy on Aave V3 Polygon with automatic rebalancing',
      allocation: 60,
      isActive: true,
    },
    {
      address: '0x0000000000000000000000000000000000000002',
      name: 'QuickSwap LP',
      description: 'Liquidity provision strategy on QuickSwap V3 with concentrated positions',
      allocation: 40,
      isActive: true,
    },
  ];

  for (const strategy of strategies) {
    await prisma.strategy.upsert({
      where: { address: strategy.address },
      update: strategy,
      create: strategy,
    });
  }
  console.log('✓ Strategies created');

  // Create historical vault snapshots for the last 30 days
  const now = new Date();
  let tvl = 4500000;
  let sharePrice = 1.0;

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Simulate growth
    tvl += (Math.random() - 0.3) * 50000;
    sharePrice += (Math.random() - 0.4) * 0.002;
    
    const dailyApy = 15 + Math.random() * 15;

    await prisma.vaultSnapshot.upsert({
      where: { date },
      update: {
        tvl: Math.max(tvl, 4000000),
        totalShares: Math.max(tvl, 4000000) / sharePrice,
        sharePrice: Math.max(sharePrice, 0.98),
        totalUsers: Math.floor(1000 + (30 - i) * 10 + Math.random() * 50),
        dailyProfit: Math.max(tvl, 4000000) * (dailyApy / 100 / 365),
        dailyApy,
        strategyAllocations: JSON.stringify({ aave: 60, quickswap: 40 }),
      },
      create: {
        date,
        tvl: Math.max(tvl, 4000000),
        totalShares: Math.max(tvl, 4000000) / sharePrice,
        sharePrice: Math.max(sharePrice, 0.98),
        totalUsers: Math.floor(1000 + (30 - i) * 10 + Math.random() * 50),
        dailyProfit: Math.max(tvl, 4000000) * (dailyApy / 100 / 365),
        dailyApy,
        strategyAllocations: JSON.stringify({ aave: 60, quickswap: 40 }),
      },
    });
  }
  console.log('✓ Vault snapshots created');

  // Create a demo harvest event (only if not exists)
  const existingHarvest = await prisma.harvestEvent.findFirst();
  if (!existingHarvest) {
    await prisma.harvestEvent.create({
      data: {
        txHash: '0x' + '0'.repeat(64),
        totalProfit: 1234.56,
        performanceFee: 123.46,
        netProfit: 1111.10,
        strategyProfits: JSON.stringify({ aave: 740.74, quickswap: 493.82 }),
        gasUsed: 450000,
        gasPrice: 30,
      },
    });
    console.log('✓ Harvest event created');
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
