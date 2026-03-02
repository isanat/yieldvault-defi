import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, UserVaultInfo } from '@/types';

const generateMockUserVaultInfo = (address: string): UserVaultInfo => {
  const hash = address.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const baseShares = Math.abs(hash % 10000) + 100;
  const sharePrice = 1.0218;
  
  return {
    address,
    shares: baseShares,
    usdValue: baseShares * sharePrice,
    totalDeposited: baseShares + Math.abs(hash % 500),
    totalWithdrawn: Math.abs(hash % 100),
    totalEarnings: baseShares * (sharePrice - 1) + Math.abs(hash % 50),
    pendingCommissions: Math.abs(hash % 200) / 10,
    referrer: hash % 3 === 0 ? '0x9876543210987654321098765432109876543210' : null,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    
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

    const userVaultInfo = generateMockUserVaultInfo(address);

    const response: ApiResponse<{
      vaultInfo: UserVaultInfo;
    }> = {
      success: true,
      data: {
        vaultInfo: userVaultInfo,
      },
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
