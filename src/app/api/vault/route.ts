import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ApiResponse, VaultInfo, VaultChartData, ChartDataPoint } from '@/types';

/**
 * GET /api/vault
 * Get vault information from database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Get latest vault snapshot
    const latestSnapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { date: 'desc' },
    });

    // Calculate totals from users
    const userStats = await prisma.user.aggregate({
      _count: { id: true },
      _sum: { 
        totalDeposited: true, 
        currentShares: true, 
        totalEarnings: true 
      },
    });

    // Get latest harvest event
    const latestHarvest = await prisma.harvestEvent.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    // Calculate APY from historical data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSnapshots = await prisma.vaultSnapshot.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
    });

    let apy7d = 0;
    let apy30d = 0;
    
    if (recentSnapshots.length >= 2) {
      const first = recentSnapshots[0];
      const last = recentSnapshots[recentSnapshots.length - 1];
      
      // 30-day APY
      if (first.sharePrice > 0) {
        const priceGrowth = (last.sharePrice - first.sharePrice) / first.sharePrice;
        apy30d = priceGrowth * (365 / 30) * 100;
      }
      
      // 7-day APY
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7Days = recentSnapshots.filter(s => new Date(s.date) >= sevenDaysAgo);
      if (last7Days.length >= 2) {
        const first7 = last7Days[0];
        const last7 = last7Days[last7Days.length - 1];
        if (first7.sharePrice > 0) {
          const growth7d = (last7.sharePrice - first7.sharePrice) / first7.sharePrice;
          apy7d = growth7d * (365 / 7) * 100;
        }
      }
    }

    // Get total deposits from database
    const totalDeposits = await prisma.deposit.aggregate({
      _sum: { amount: true },
    });

    const vault: VaultInfo = {
      tvl: latestSnapshot?.tvl || totalDeposits._sum.amount || 0,
      totalShares: latestSnapshot?.totalShares || userStats._sum.currentShares || 0,
      sharePrice: latestSnapshot?.sharePrice || 1.0,
      apy: latestSnapshot?.dailyApy || 0,
      apy7d,
      apy30d,
      totalUsers: userStats._count.id,
      lastHarvest: latestHarvest?.timestamp || null,
    };

    const response: ApiResponse<{
      vault: VaultInfo;
      chartData?: VaultChartData;
      recentTransactions?: unknown[];
    }> = {
      success: true,
      data: { vault },
      timestamp: Date.now(),
    };

    // Include chart data if requested
    if (include.includes('chart')) {
      const chartSnapshots = await prisma.vaultSnapshot.findMany({
        where: {
          date: { gte: new Date(Date.now() - days * 86400000) },
        },
        orderBy: { date: 'asc' },
      });

      const chartData: VaultChartData = {
        tvl: chartSnapshots.map(s => ({
          timestamp: Math.floor(new Date(s.date).getTime() / 1000),
          value: s.tvl,
        })),
        sharePrice: chartSnapshots.map(s => ({
          timestamp: Math.floor(new Date(s.date).getTime() / 1000),
          value: s.sharePrice,
        })),
        apy: chartSnapshots.map(s => ({
          timestamp: Math.floor(new Date(s.date).getTime() / 1000),
          value: s.dailyApy,
        })),
      };

      response.data!.chartData = chartData;
    }

    // Include recent transactions if requested
    if (include.includes('transactions')) {
      const transactions = await prisma.transaction.findMany({
        take: 20,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { address: true } } },
      });

      response.data!.recentTransactions = transactions.map(t => ({
        txHash: t.txHash,
        type: t.type,
        amount: t.amount,
        userAddress: t.user?.address || null,
        timestamp: t.timestamp,
        status: t.status,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching vault info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vault information',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
