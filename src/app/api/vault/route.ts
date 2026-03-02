import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, VaultInfo, VaultChartData, ChartDataPoint } from '@/types';

// Mock data for demo
const MOCK_VAULT_INFO: VaultInfo = {
  tvl: 5234567,
  totalShares: 5123456.78,
  sharePrice: 1.0218,
  apy: 23.5,
  apy7d: 22.8,
  apy30d: 24.1,
  totalUsers: 1234,
  lastHarvest: new Date(Date.now() - 3600000),
};

const generateMockChartData = (days: number): VaultChartData => {
  const tvl: ChartDataPoint[] = [];
  const sharePrice: ChartDataPoint[] = [];
  const apy: ChartDataPoint[] = [];
  const now = Date.now();
  
  let currentTvl = 4800000;
  let currentPrice = 1.0;
  let currentApy = 20;
  
  for (let i = days - 1; i >= 0; i--) {
    const timestamp = Math.floor((now - i * 86400000) / 1000);
    
    currentTvl += (Math.random() - 0.3) * 50000;
    currentPrice += (Math.random() - 0.4) * 0.002;
    currentApy += (Math.random() - 0.5) * 2;
    
    tvl.push({ timestamp, value: Math.max(currentTvl, 4000000) });
    sharePrice.push({ timestamp, value: Math.max(currentPrice, 0.95) });
    apy.push({ timestamp, value: Math.max(Math.min(currentApy, 35), 15) });
  }
  
  return { tvl, sharePrice, apy };
};

const generateMockTransactions = () => {
  const types = ['deposit', 'withdraw', 'harvest'];
  const transactions = [];
  
  for (let i = 0; i < 20; i++) {
    transactions.push({
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type: types[Math.floor(Math.random() * types.length)],
      amount: Math.random() * 10000 + 100,
      userAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: new Date(Date.now() - Math.random() * 7 * 86400000),
      status: 'confirmed',
    });
  }
  
  return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

/**
 * GET /api/vault
 * Get vault information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];
    const days = parseInt(searchParams.get('days') || '30', 10);

    const response: ApiResponse<{
      vault: VaultInfo;
      chartData?: VaultChartData;
      recentTransactions?: unknown[];
    }> = {
      success: true,
      data: {
        vault: MOCK_VAULT_INFO,
      },
      timestamp: Date.now(),
    };

    if (include.includes('chart')) {
      response.data!.chartData = generateMockChartData(days);
    }

    if (include.includes('transactions')) {
      response.data!.recentTransactions = generateMockTransactions();
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
