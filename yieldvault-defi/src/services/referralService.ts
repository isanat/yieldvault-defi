import { PrismaClient } from '@prisma/client';
import type { 
  ReferralStats, 
  LevelStats, 
  ReferralTreeNode 
} from '@/types';

const prisma = new PrismaClient();

// Referral commission rates from Config contract
const DEFAULT_REFERRAL_RATES = [40, 25, 15, 12, 8]; // Percentages per level

/**
 * Get user's referral statistics
 */
export async function getReferralStats(address: string): Promise<ReferralStats> {
  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    include: {
      referrals: {
        include: {
          referrals: true, // Level 2
        },
      },
      commissions: true,
    },
  });

  if (!user) {
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      totalReferredVolume: 0,
      totalCommissions: 0,
      pendingCommissions: 0,
      levelBreakdown: [],
    };
  }

  // Calculate level breakdown
  const levelBreakdown = await Promise.all([
    getLevelStats(user.id, 1),
    getLevelStats(user.id, 2),
    getLevelStats(user.id, 3),
    getLevelStats(user.id, 4),
    getLevelStats(user.id, 5),
  ]);

  const totalCommissions = user.commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingCommissions = user.commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    totalReferrals: levelBreakdown.reduce((sum, l) => sum + l.count, 0),
    activeReferrals: levelBreakdown.reduce((sum, l) => sum + l.activeCount || 0, 0),
    totalReferredVolume: levelBreakdown.reduce((sum, l) => sum + l.volume, 0),
    totalCommissions,
    pendingCommissions,
    levelBreakdown,
  };
}

/**
 * Get statistics for a specific referral level
 */
async function getLevelStats(userId: string, level: number): Promise<LevelStats & { activeCount: number }> {
  // Get users at this level using recursive query
  const usersAtLevel = await getUsersAtLevel(userId, level);
  
  const count = usersAtLevel.length;
  const volume = usersAtLevel.reduce((sum, u) => sum + u.totalDeposited, 0);
  const activeCount = usersAtLevel.filter((u) => u.currentShares > 0).length;

  return {
    level,
    count,
    volume,
    activeCount,
    commissionRate: DEFAULT_REFERRAL_RATES[level - 1] || 0,
  };
}

/**
 * Recursively get users at a specific level
 */
async function getUsersAtLevel(userId: string, targetLevel: number): Promise<{
  id: string;
  address: string;
  totalDeposited: number;
  currentShares: number;
}[]> {
  if (targetLevel < 1 || targetLevel > 5) return [];

  let currentLevelUsers = [userId];
  
  for (let level = 1; level <= targetLevel; level++) {
    const nextLevelUsers: string[] = [];
    
    for (const uid of currentLevelUsers) {
      const directReferrals = await prisma.user.findMany({
        where: { referrerId: uid },
        select: { id: true },
      });
      nextLevelUsers.push(...directReferrals.map((r) => r.id));
    }
    
    if (level === targetLevel) {
      // Return user data for this level
      return prisma.user.findMany({
        where: { id: { in: nextLevelUsers } },
        select: {
          id: true,
          address: true,
          totalDeposited: true,
          currentShares: true,
        },
      });
    }
    
    currentLevelUsers = nextLevelUsers;
  }

  return [];
}

/**
 * Get referral tree for a user (up to 5 levels)
 */
export async function getReferralTree(
  address: string, 
  maxDepth: number = 3
): Promise<ReferralTreeNode | null> {
  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!user) return null;

  return buildReferralTree(user.id, 0, maxDepth);
}

/**
 * Recursively build referral tree
 */
async function buildReferralTree(
  userId: string, 
  currentDepth: number, 
  maxDepth: number
): Promise<ReferralTreeNode> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      commissions: {
        where: { status: 'claimed' },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const totalCommissions = user.commissions.reduce((sum, c) => sum + c.amount, 0);

  const node: ReferralTreeNode = {
    address: user.address,
    level: currentDepth,
    totalDeposited: user.totalDeposited,
    totalCommissions,
    joinedAt: user.createdAt,
    children: [],
  };

  if (currentDepth < maxDepth) {
    const directReferrals = await prisma.user.findMany({
      where: { referrerId: userId },
      select: { id: true },
    });

    for (const referral of directReferrals) {
      const childTree = await buildReferralTree(referral.id, currentDepth + 1, maxDepth);
      node.children.push(childTree);
    }
  }

  return node;
}

/**
 * Register a new referral relationship
 */
export async function registerReferral(
  userAddress: string, 
  referrerAddress: string
): Promise<boolean> {
  const userAddr = userAddress.toLowerCase();
  const referrerAddr = referrerAddress.toLowerCase();

  if (userAddr === referrerAddr) {
    throw new Error('Cannot refer yourself');
  }

  // Check if user already has a referrer
  const existingUser = await prisma.user.findUnique({
    where: { address: userAddr },
  });

  if (existingUser?.referrerId) {
    throw new Error('User already has a referrer');
  }

  // Check for circular references
  const isCircular = await checkCircularReferral(referrerAddr, userAddr);
  if (isCircular) {
    throw new Error('Circular referral not allowed');
  }

  // Get or create referrer
  let referrer = await prisma.user.findUnique({
    where: { address: referrerAddr },
  });

  if (!referrer) {
    referrer = await prisma.user.create({
      data: { address: referrerAddr },
    });
  }

  // Update or create user
  if (existingUser) {
    await prisma.user.update({
      where: { address: userAddr },
      data: { referrerId: referrer.id },
    });
  } else {
    await prisma.user.create({
      data: {
        address: userAddr,
        referrerId: referrer.id,
      },
    });
  }

  return true;
}

/**
 * Check for circular referral relationships
 */
async function checkCircularReferral(
  potentialReferrer: string, 
  potentialDownline: string
): Promise<boolean> {
  let current = potentialReferrer;
  
  for (let i = 0; i < 5; i++) {
    const user = await prisma.user.findUnique({
      where: { address: current.toLowerCase() },
      include: { referrer: true },
    });

    if (!user?.referrer) break;
    
    if (user.referrer.address.toLowerCase() === potentialDownline.toLowerCase()) {
      return true;
    }
    
    current = user.referrer.address;
  }

  return false;
}

/**
 * Record a referral commission
 */
export async function recordCommission(data: {
  userId: string;
  fromUserId: string;
  level: number;
  commissionType: 'deposit' | 'interest';
  amount: number;
  txHash?: string;
}) {
  return prisma.referralCommission.create({
    data: {
      userId: data.userId,
      fromUserId: data.fromUserId,
      level: data.level,
      commissionType: data.commissionType,
      amount: data.amount,
      txHash: data.txHash,
      status: 'pending',
    },
  });
}

/**
 * Claim pending commissions
 */
export async function claimCommissions(address: string): Promise<{
  success: boolean;
  amount: number;
  txHash?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    include: {
      commissions: {
        where: { status: 'pending' },
      },
    },
  });

  if (!user || user.commissions.length === 0) {
    return { success: false, amount: 0 };
  }

  const totalAmount = user.commissions.reduce((sum, c) => sum + c.amount, 0);

  // In production, would call smart contract to claim
  // For now, just mark as claimed
  await prisma.referralCommission.updateMany({
    where: {
      userId: user.id,
      status: 'pending',
    },
    data: {
      status: 'claimed',
      claimedAt: new Date(),
    },
  });

  return {
    success: true,
    amount: totalAmount,
    // txHash would come from blockchain transaction
  };
}

/**
 * Get commission history for a user
 */
export async function getCommissionHistory(
  address: string, 
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  const user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!user) return [];

  return prisma.referralCommission.findMany({
    where: { userId: user.id },
    take: limit,
    skip: offset,
    orderBy: { timestamp: 'desc' },
    include: {
      user: { select: { address: true } },
    },
  });
}

export default {
  getReferralStats,
  getReferralTree,
  registerReferral,
  recordCommission,
  claimCommissions,
  getCommissionHistory,
};
