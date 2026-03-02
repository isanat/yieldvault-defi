import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ApiResponse, UserVaultInfo } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const normalizedAddress = address.toLowerCase();
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid wallet address is required',
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
      include: {
        referrer: { select: { address: true } },
      },
    });

    if (!user) {
      // Create user on first access
      user = await prisma.user.create({
        data: { address: normalizedAddress },
        include: {
          referrer: { select: { address: true } },
        },
      });
    }

    // Get latest share price
    const latestSnapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { date: 'desc' },
      select: { sharePrice: true },
    });
    const sharePrice = latestSnapshot?.sharePrice || 1.0;

    // Calculate pending commissions
    const pendingCommissions = await prisma.referralCommission.aggregate({
      where: {
        userId: user.id,
        status: 'pending',
      },
      _sum: { amount: true },
    });

    const userVaultInfo: UserVaultInfo = {
      address: user.address,
      shares: user.currentShares,
      usdValue: user.currentShares * sharePrice,
      totalDeposited: user.totalDeposited,
      totalWithdrawn: user.totalWithdrawn,
      totalEarnings: user.totalEarnings,
      pendingCommissions: pendingCommissions._sum.amount || 0,
      referrer: user.referrer?.address || null,
    };

    const response: ApiResponse<{
      vaultInfo: UserVaultInfo;
    }> = {
      success: true,
      data: { vaultInfo: userVaultInfo },
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user information',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
