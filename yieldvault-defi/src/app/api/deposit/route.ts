import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ApiResponse } from '@/types';
import { 
  validateTransaction, 
  checkRateLimit,
  getUSDTBalance,
  checkUSDTAllowance 
} from '@/lib/blockchain-validator';

interface DepositRequest {
  address: string;
  amount: number;
  referrerCode?: string;
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
    const rateLimit = checkRateLimit(`deposit:${ip}`, 5, 60_000); // 5 requests per minute
    
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

    // ==========================================
    // ON-CHAIN VALIDATION (CRITICAL SECURITY FIX)
    // ==========================================
    const expectedAmount = BigInt(Math.floor(amount * Math.pow(10, USDT_DECIMALS)));
    
    // Validate the transaction on-chain
    const validation = await validateTransaction(
      txHash,
      'deposit',
      normalizedAddress,
      expectedAmount
    );

    if (!validation.isValid) {
      console.error(`Deposit validation failed for ${txHash}:`, validation.error);
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

    // Use on-chain data for amounts (more reliable than user input)
    const onChainAmount = validation.data?.amount 
      ? Number(validation.data.amount) / Math.pow(10, USDT_DECIMALS)
      : amount;

    const onChainShares = validation.data?.shares;

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

    // Calculate shares (use on-chain shares if available, otherwise calculate)
    const feeRate = 0.005; // 0.5% deposit fee
    const feeAmount = onChainAmount * feeRate;
    const netAmount = onChainAmount - feeAmount;
    const calculatedShares = netAmount / sharePrice;

    // Use on-chain shares if available and reasonable
    const shares = onChainShares 
      ? Number(onChainShares) / Math.pow(10, USDT_DECIMALS) 
      : calculatedShares;

    // Create deposit record and update user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create deposit
      const deposit = await tx.deposit.create({
        data: {
          txHash,
          userId: user!.id,
          amount: onChainAmount,
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
          totalDeposited: { increment: onChainAmount },
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
          amount: onChainAmount,
          status: 'confirmed',
          blockNumber: validation.data?.blockNumber ? Number(validation.data.blockNumber) : null,
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
        validated: boolean;
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
    console.error('Error processing deposit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process deposit', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
