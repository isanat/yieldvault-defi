import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ApiResponse } from '@/types';
import { 
  validateTransaction, 
  checkRateLimit,
  getVaultShareBalance 
} from '@/lib/blockchain-validator';

interface WithdrawRequest {
  address: string;
  shares: number;
  txHash: string;
}

// USDT has 6 decimals
const USDT_DECIMALS = 6;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimit = checkRateLimit(`withdraw:${ip}`, 5, 60_000); // 5 requests per minute
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please wait before trying again.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
          timestamp: Date.now() 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toString(),
          }
        }
      );
    }

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
        { success: false, error: 'User not found. Please make a deposit first.', timestamp: Date.now() },
        { status: 404 }
      );
    }

    // ==========================================
    // ON-CHAIN VALIDATION (CRITICAL SECURITY FIX)
    // ==========================================
    
    // Validate the transaction on-chain
    const validation = await validateTransaction(
      txHash,
      'withdraw',
      normalizedAddress
    );

    if (!validation.isValid) {
      console.error(`Withdraw validation failed for ${txHash}:`, validation.error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Transaction validation failed: ${validation.error}`,
          timestamp: Date.now() 
        },
        { status: 400 }
      );
    }

    // Additional validation: verify the transaction is from the claimed address
    if (validation.data && validation.data.from.toLowerCase() !== normalizedAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction sender address mismatch',
          timestamp: Date.now() 
        },
        { status: 400 }
      );
    }

    // Use on-chain data for amounts
    const onChainAmount = validation.data?.amount 
      ? Number(validation.data.amount) / Math.pow(10, USDT_DECIMALS)
      : 0;

    const onChainShares = validation.data?.shares
      ? Number(validation.data.shares) / Math.pow(10, USDT_DECIMALS)
      : shares;

    // Verify the user has enough shares on-chain (double-check)
    const onChainShareBalance = await getVaultShareBalance(normalizedAddress);
    const onChainSharesNumber = Number(onChainShares) / Math.pow(10, USDT_DECIMALS);

    // Check if user has enough shares in our database
    if (user.currentShares < onChainShares) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient shares balance',
          details: {
            requested: onChainShares,
            available: user.currentShares,
          },
          timestamp: Date.now() 
        },
        { status: 400 }
      );
    }

    // Get current share price
    const latestSnapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { date: 'desc' },
      select: { sharePrice: true },
    });
    const sharePrice = latestSnapshot?.sharePrice || 1.0;

    // Calculate amount based on shares
    const calculatedAmount = onChainShares * sharePrice;
    const amount = onChainAmount > 0 ? onChainAmount : calculatedAmount;

    // Create withdrawal record and update user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create withdrawal
      const withdrawal = await tx.withdrawal.create({
        data: {
          txHash,
          userId: user.id,
          shares: onChainShares,
          amount,
          sharePrice,
        },
      });

      // Update user stats
      await tx.user.update({
        where: { id: user.id },
        data: {
          totalWithdrawn: { increment: amount },
          currentShares: { decrement: onChainShares },
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
          blockNumber: validation.data?.blockNumber ? Number(validation.data.blockNumber) : null,
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
        validated: boolean;
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
          validated: true,
        },
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString(),
      }
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process withdrawal', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
