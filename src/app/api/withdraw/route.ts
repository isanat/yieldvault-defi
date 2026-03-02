import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ApiResponse } from '@/types';

interface WithdrawRequest {
  address: string;
  shares: number;
  txHash: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const { address, shares, txHash } = body;

    // Validate input
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet address is required', timestamp: Date.now() },
        { status: 400 }
      );
    }

    if (!shares || shares <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid shares amount is required', timestamp: Date.now() },
        { status: 400 }
      );
    }

    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { success: false, error: 'Valid transaction hash is required', timestamp: Date.now() },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Check for duplicate transaction
    const existingWithdrawal = await prisma.withdrawal.findUnique({
      where: { txHash },
    });

    if (existingWithdrawal) {
      return NextResponse.json(
        { success: false, error: 'Transaction already processed', timestamp: Date.now() },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found', timestamp: Date.now() },
        { status: 404 }
      );
    }

    // Check if user has enough shares
    if (user.currentShares < shares) {
      return NextResponse.json(
        { success: false, error: 'Insufficient shares balance', timestamp: Date.now() },
        { status: 400 }
      );
    }

    // Get current share price
    const latestSnapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { date: 'desc' },
      select: { sharePrice: true },
    });
    const sharePrice = latestSnapshot?.sharePrice || 1.0;

    // Calculate amount (shares * sharePrice)
    const amount = shares * sharePrice;

    // Create withdrawal record and update user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create withdrawal
      const withdrawal = await tx.withdrawal.create({
        data: {
          txHash,
          userId: user.id,
          shares,
          amount,
          sharePrice,
        },
      });

      // Update user stats
      await tx.user.update({
        where: { id: user.id },
        data: {
          totalWithdrawn: { increment: amount },
          currentShares: { decrement: shares },
          lastActivityAt: new Date(),
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          txHash,
          userId: user.id,
          type: 'withdraw',
          amount,
          status: 'confirmed',
        },
      });

      return withdrawal;
    });

    const response: ApiResponse<{
      success: boolean;
      withdrawal: {
        id: string;
        amount: number;
        shares: number;
        sharePrice: number;
      };
    }> = {
      success: true,
      data: {
        success: true,
        withdrawal: {
          id: result.id,
          amount: result.amount,
          shares: result.shares,
          sharePrice: result.sharePrice,
        },
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process withdrawal', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
