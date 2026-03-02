import { NextRequest, NextResponse } from 'next/server';
import { 
  getReferralStats, 
  getReferralTree, 
  registerReferral,
  claimCommissions,
  getCommissionHistory 
} from '@/services/referralService';
import type { ApiResponse, ReferralStats, ReferralTreeNode } from '@/types';

/**
 * GET /api/referral
 * Get referral statistics for an address
 * Query params:
 * - address: wallet address (required)
 * - tree: include referral tree (boolean)
 * - depth: tree depth (1-5, default 3)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const includeTree = searchParams.get('tree') === 'true';
    const depth = Math.min(5, Math.max(1, parseInt(searchParams.get('depth') || '3', 10)));

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid wallet address is required',
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    const [stats, tree] = await Promise.all([
      getReferralStats(address),
      includeTree ? getReferralTree(address, depth) : null,
    ]);

    const response: ApiResponse<{
      stats: ReferralStats;
      tree: ReferralTreeNode | null;
    }> = {
      success: true,
      data: {
        stats,
        tree,
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching referral info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch referral information',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/referral
 * Register a new referral relationship or claim commissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userAddress, referrerAddress } = body;

    if (action === 'register') {
      if (!userAddress || !referrerAddress) {
        return NextResponse.json(
          {
            success: false,
            error: 'userAddress and referrerAddress are required',
            timestamp: Date.now(),
          },
          { status: 400 }
        );
      }

      await registerReferral(userAddress, referrerAddress);

      return NextResponse.json({
        success: true,
        data: { registered: true },
        timestamp: Date.now(),
      });
    }

    if (action === 'claim') {
      if (!userAddress) {
        return NextResponse.json(
          {
            success: false,
            error: 'userAddress is required',
            timestamp: Date.now(),
          },
          { status: 400 }
        );
      }

      const result = await claimCommissions(userAddress);

      return NextResponse.json({
        success: result.success,
        data: {
          claimed: result.success,
          amount: result.amount,
          txHash: result.txHash,
        },
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use "register" or "claim"',
        timestamp: Date.now(),
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in referral action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referral/commissions
 * Get commission history for an address
 */
export async function getCommissionHistoryHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    const commissions = await getCommissionHistory(address, { limit, offset });

    return NextResponse.json({
      success: true,
      data: commissions,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch commission history',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
