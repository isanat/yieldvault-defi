import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ApiResponse } from '@/types';

interface DepositRequest {
  address: string;
  amount: number;
  referrerCode?: string;
  txHash: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DepositRequest = await request.json();
    const { address, amount, referrerCode, txHash } = body;

    // Validate input
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet address is required', timestamp: Date.now() },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required', timestamp: Date.now() },
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
    const existingDeposit = await prisma.deposit.findUnique({
      where: { txHash },
    });

    if (existingDeposit) {
      return NextResponse.json(
        { success: false, error: 'Transaction already processed', timestamp: Date.now() },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { address: normalizedAddress },
    });

    if (!user) {
      // Find referrer if provided
      let referrerId: string | undefined;
      if (referrerCode) {
        const referrer = await prisma.user.findFirst({
          where: { address: referrerCode.toLowerCase() },
        });
        if (referrer) referrerId = referrer.id;
      }

      user = await prisma.user.create({
        data: {
          address: normalizedAddress,
          referrerId,
        },
      });
    }

    // Get current share price
    const latestSnapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { date: 'desc' },
      select: { sharePrice: true },
    });
    const sharePrice = latestSnapshot?.sharePrice || 1.0;

    // Calculate shares to mint (with 0.5% deposit fee)
    const feeRate = 0.005;
    const feeAmount = amount * feeRate;
    const netAmount = amount - feeAmount;
    const shares = netAmount / sharePrice;

    // Create deposit record and update user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create deposit
      const deposit = await tx.deposit.create({
        data: {
          txHash,
          userId: user!.id,
          amount,
          shares,
          sharePrice,
          feeAmount,
          referrerAddress: referrerCode?.toLowerCase(),
        },
      });

      // Update user stats
      await tx.user.update({
        where: { id: user!.id },
        data: {
          totalDeposited: { increment: amount },
          currentShares: { increment: shares },
          lastActivityAt: new Date(),
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          txHash,
          userId: user!.id,
          type: 'deposit',
          amount,
          status: 'confirmed',
        },
      });

      return deposit;
    });

    const response: ApiResponse<{
      success: boolean;
      deposit: {
        id: string;
        amount: number;
        shares: number;
        sharePrice: number;
        feeAmount: number;
      };
    }> = {
      success: true,
      data: {
        success: true,
        deposit: {
          id: result.id,
          amount: result.amount,
          shares: result.shares,
          sharePrice: result.sharePrice,
          feeAmount: result.feeAmount,
        },
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing deposit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process deposit', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
