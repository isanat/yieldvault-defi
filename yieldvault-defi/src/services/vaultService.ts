import { PrismaClient } from '@prisma/client';
import type { 
  VaultInfo, 
  UserVaultInfo, 
  VaultChartData,
  ChartDataPoint 
} from '@/types';

const prisma = new PrismaClient();

// Contract ABIs (simplified for reading)
const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function sharePrice() view returns (uint256)',
  'function lastHarvestTimestamp() view returns (uint256)',
  'function totalProfitHarvested() view returns (uint256)',
];

const REFERRAL_ABI = [
  'function getReferrer(address) view returns (address)',
  'function getPendingCommissions(address) view returns (uint256)',
  'function getReferralStats(address) view returns (uint256, uint256, uint256)',
];

const CONFIG_ABI = [
  'function performanceFeeBP() view returns (uint256)',
  'function depositFeeBP() view returns (uint256)',
  'function depositsEnabled() view returns (bool)',
  'function withdrawalsEnabled() view returns (bool)',
];

// Polygon addresses (would come from env in production)
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '';
const REFERRAL_ADDRESS = process.env.NEXT_PUBLIC_REFERRAL_ADDRESS || '';
const CONFIG_ADDRESS = process.env.NEXT_PUBLIC_CONFIG_ADDRESS || '';
const USDT_DECIMALS = 6;

/**
 * Get vault information from blockchain and database
 */
export async function getVaultInfo(): Promise<VaultInfo> {
  // Get latest snapshot from database
  const latestSnapshot = await prisma.vaultSnapshot.findFirst({
    orderBy: { date: 'desc' },
  });

  // Get harvest stats
  const harvestStats = await prisma.harvestEvent.aggregate({
    _sum: { totalProfit: true },
    _count: true,
  });

  // Get user count
  const totalUsers = await prisma.user.count({
    where: { currentShares: { gt: 0 } },
  });

  // Calculate APYs from historical data
  const snapshots = await prisma.vaultSnapshot.findMany({
    take: 30,
    orderBy: { date: 'desc' },
  });

  const apy7d = calculateApyFromSnapshots(snapshots.slice(0, 7));
  const apy30d = calculateApyFromSnapshots(snapshots.slice(0, 30));

  return {
    tvl: latestSnapshot?.tvl || 0,
    totalShares: latestSnapshot?.totalShares || 0,
    sharePrice: latestSnapshot?.sharePrice || 1,
    apy: apy7d,
    apy7d,
    apy30d,
    totalUsers,
    lastHarvest: latestSnapshot?.createdAt || null,
  };
}

/**
 * Get user's vault information
 */
export async function getUserVaultInfo(address: string): Promise<UserVaultInfo | null> {
  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    include: {
      commissions: {
        where: { status: 'pending' },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Get latest share price
  const latestSnapshot = await prisma.vaultSnapshot.findFirst({
    orderBy: { date: 'desc' },
    select: { sharePrice: true },
  });

  const sharePrice = latestSnapshot?.sharePrice || 1;
  const usdValue = user.currentShares * sharePrice;
  const pendingCommissions = user.commissions.reduce((sum, c) => sum + c.amount, 0);

  return {
    address: user.address,
    shares: user.currentShares,
    usdValue,
    totalDeposited: user.totalDeposited,
    totalWithdrawn: user.totalWithdrawn,
    totalEarnings: user.totalEarnings,
    pendingCommissions,
    referrer: user.referrerId || null,
  };
}

/**
 * Get vault chart data
 */
export async function getVaultChartData(days: number = 30): Promise<VaultChartData> {
  const snapshots = await prisma.vaultSnapshot.findMany({
    take: days,
    orderBy: { date: 'desc' },
  });

  const tvl: ChartDataPoint[] = [];
  const sharePrice: ChartDataPoint[] = [];
  const apy: ChartDataPoint[] = [];

  for (const snapshot of snapshots.reverse()) {
    const timestamp = Math.floor(new Date(snapshot.date).getTime() / 1000);
    
    tvl.push({ timestamp, value: snapshot.tvl });
    sharePrice.push({ timestamp, value: snapshot.sharePrice });
    apy.push({ timestamp, value: snapshot.dailyApy });
  }

  return { tvl, sharePrice, apy };
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit: number = 50) {
  const transactions = await prisma.transaction.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: { address: true },
      },
    },
  });

  return transactions.map((tx) => ({
    txHash: tx.txHash,
    type: tx.type,
    amount: tx.amount,
    userAddress: tx.user?.address,
    timestamp: tx.timestamp,
    status: tx.status,
  }));
}

/**
 * Get harvest history
 */
export async function getHarvestHistory(limit: number = 20) {
  const harvests = await prisma.harvestEvent.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
  });

  return harvests.map((h) => ({
    txHash: h.txHash,
    timestamp: h.timestamp,
    totalProfit: h.totalProfit,
    performanceFee: h.performanceFee,
    netProfit: h.netProfit,
    gasUsed: h.gasUsed,
  }));
}

/**
 * Calculate APY from snapshots
 */
function calculateApyFromSnapshots(snapshots: { dailyProfit: number; tvl: number }[]): number {
  if (snapshots.length === 0) return 0;

  const totalProfit = snapshots.reduce((sum, s) => sum + s.dailyProfit, 0);
  const avgTvl = snapshots.reduce((sum, s) => sum + s.tvl, 0) / snapshots.length;

  if (avgTvl === 0) return 0;

  // Annualize: daily return * 365
  const dailyReturn = totalProfit / snapshots.length / avgTvl;
  const apy = Math.pow(1 + dailyReturn, 365) - 1;

  return apy * 100; // Convert to percentage
}

/**
 * Update vault snapshot (called by bot/cron)
 */
export async function updateVaultSnapshot(data: {
  tvl: number;
  totalShares: number;
  sharePrice: number;
  totalUsers: number;
  dailyProfit: number;
  strategyAllocations?: string;
}) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Calculate daily APY
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdaySnapshot = await prisma.vaultSnapshot.findUnique({
    where: { date: yesterday },
  });

  let dailyApy = 0;
  if (yesterdaySnapshot && yesterdaySnapshot.tvl > 0) {
    dailyApy = (data.dailyProfit / yesterdaySnapshot.tvl) * 365 * 100;
  }

  return prisma.vaultSnapshot.upsert({
    where: { date: today },
    create: {
      ...data,
      dailyApy,
    },
    update: {
      ...data,
      dailyApy,
    },
  });
}

export default {
  getVaultInfo,
  getUserVaultInfo,
  getVaultChartData,
  getRecentTransactions,
  getHarvestHistory,
  updateVaultSnapshot,
};
