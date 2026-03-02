import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type { ApiResponse, AdminStats, SystemConfig } from '@/types';

const prisma = new PrismaClient();

// Simple admin authentication (in production, use proper auth)
const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES || '').toLowerCase().split(',');

/**
 * Verify admin access
 */
function verifyAdmin(authHeader: string | null): boolean {
  if (!authHeader) return false;
  
  // In production, verify JWT or signature
  // For now, simple token check
  const token = authHeader.replace('Bearer ', '');
  return ADMIN_ADDRESSES.includes(token.toLowerCase()) || token === process.env.ADMIN_API_KEY;
}

/**
 * GET /api/admin
 * Get admin dashboard statistics
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!verifyAdmin(authHeader)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        timestamp: Date.now(),
      },
      { status: 401 }
    );
  }

  try {
    const [
      totalUsers,
      totalDeposits,
      totalWithdrawals,
      totalHarvests,
      recentDeposits,
      activeUsers24h,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.deposit.aggregate({ _sum: { amount: true } }),
      prisma.withdrawal.aggregate({ _sum: { amount: true } }),
      prisma.harvestEvent.aggregate({ _sum: { totalProfit: true } }),
      prisma.deposit.aggregate({
        _sum: { amount: true },
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.count({
        where: {
          lastActivityAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const stats: AdminStats = {
      totalUsers,
      totalDeposits: totalDeposits._sum.amount || 0,
      totalWithdrawals: totalWithdrawals._sum.amount || 0,
      totalVolume: (totalDeposits._sum.amount || 0) + (totalWithdrawals._sum.amount || 0),
      totalHarvests: totalHarvests._sum.totalProfit || 0,
      totalFeesCollected: 0, // Would calculate from harvest events
      avgDepositSize: totalUsers > 0 ? (totalDeposits._sum.amount || 0) / totalUsers : 0,
      activeUsers24h,
    };

    const response: ApiResponse<AdminStats> = {
      success: true,
      data: stats,
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch admin statistics',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin
 * Update system configuration
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!verifyAdmin(authHeader)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        timestamp: Date.now(),
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'updateConfig':
        return await updateSystemConfig(data);
      
      case 'toggleFeature':
        return await toggleFeature(data);
      
      case 'addStrategy':
        return await addStrategy(data);
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            timestamp: Date.now(),
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in admin action:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute admin action',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * Update system configuration
 */
async function updateSystemConfig(data: Partial<SystemConfig>) {
  const updates = [];

  if (data.fees) {
    updates.push(
      prisma.systemConfig.upsert({
        where: { key: 'fees' },
        create: { key: 'fees', value: JSON.stringify(data.fees) },
        update: { value: JSON.stringify(data.fees) },
      })
    );
  }

  if (data.referralRates) {
    updates.push(
      prisma.systemConfig.upsert({
        where: { key: 'referralRates' },
        create: { key: 'referralRates', value: JSON.stringify(data.referralRates) },
        update: { value: JSON.stringify(data.referralRates) },
      })
    );
  }

  await Promise.all(updates);

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminAddress: 'system', // Would get from auth
      action: 'updateConfig',
      details: JSON.stringify(data),
    },
  });

  return NextResponse.json({
    success: true,
    data: { updated: true },
    timestamp: Date.now(),
  });
}

/**
 * Toggle platform features
 */
async function toggleFeature(data: { feature: string; enabled: boolean }) {
  const validFeatures = ['deposits', 'withdrawals', 'harvest'];
  
  if (!validFeatures.includes(data.feature)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid feature',
        timestamp: Date.now(),
      },
      { status: 400 }
    );
  }

  await prisma.systemConfig.upsert({
    where: { key: `${data.feature}Enabled` },
    create: { key: `${data.feature}Enabled`, value: String(data.enabled) },
    update: { value: String(data.enabled) },
  });

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminAddress: 'system',
      action: 'toggleFeature',
      details: JSON.stringify(data),
    },
  });

  return NextResponse.json({
    success: true,
    data: { toggled: true, feature: data.feature, enabled: data.enabled },
    timestamp: Date.now(),
  });
}

/**
 * Add a new strategy
 */
async function addStrategy(data: { address: string; name: string; allocation: number }) {
  if (!data.address || !data.name) {
    return NextResponse.json(
      {
        success: false,
        error: 'Address and name are required',
        timestamp: Date.now(),
      },
      { status: 400 }
    );
  }

  const strategy = await prisma.strategy.create({
    data: {
      address: data.address,
      name: data.name,
      allocation: data.allocation || 0,
    },
  });

  // Log admin action
  await prisma.adminLog.create({
    data: {
      adminAddress: 'system',
      action: 'addStrategy',
      details: JSON.stringify(data),
    },
  });

  return NextResponse.json({
    success: true,
    data: strategy,
    timestamp: Date.now(),
  });
}
