import { NextResponse } from 'next/server'
import {
  V3_CONTRACTS,
  STRATEGY_CONFIG,
  getProtocolStats,
  getFees,
  getReferralRates,
  getStrategyData,
  getGasPrice,
  isVaultPaused,
} from '@/lib/blockchain'

export const dynamic = 'force-dynamic'
export const revalidate = 30 // Cache for 30 seconds

export async function GET() {
  try {
    // Fetch all real data from blockchain
    const [stats, fees, referralRates, gasPrice, isPaused, aaveLoopStrategy, stableLpStrategy] = await Promise.all([
      getProtocolStats(),
      getFees(),
      getReferralRates(),
      getGasPrice(),
      isVaultPaused(),
      getStrategyData(V3_CONTRACTS.aaveLoopStrategy as `0x${string}`),
      getStrategyData(V3_CONTRACTS.stableLpStrategy as `0x${string}`),
    ])

    return NextResponse.json({
      success: true,
      data: {
        // Contract addresses
        contracts: V3_CONTRACTS,

        // Protocol stats (REAL DATA)
        stats: {
          tvl: stats.tvl.toString(),
          tvlFormatted: stats.tvlFormatted,
          users: stats.totalUsers,
          avgAPY: stats.avgAPY,
          totalPaidOut: stats.totalPaidOut,
          totalSupply: stats.totalSupply.toString(),
        },

        // Fees (REAL DATA)
        fees: {
          performanceFeeBP: Number(fees.performanceFeeBP),
          depositFeeBP: Number(fees.depositFeeBP),
          managementFeeBP: Number(fees.managementFeeBP),
          withdrawalFeeBP: Number(fees.withdrawalFeeBP),
        },

        // Referral rates (REAL DATA)
        referralRates: referralRates.map(r => Number(r)),

        // Real Strategy Data from deployed contracts
        strategies: {
          aaveLoop: {
            name: STRATEGY_CONFIG.aaveLoop.name,
            address: V3_CONTRACTS.aaveLoopStrategy,
            apy: aaveLoopStrategy.apyFormatted || '8-15',
            apyRange: STRATEGY_CONFIG.aaveLoop.expectedApy,
            risk: STRATEGY_CONFIG.aaveLoop.risk,
            description: STRATEGY_CONFIG.aaveLoop.description,
            allocation: STRATEGY_CONFIG.aaveLoop.allocation,
            isActive: aaveLoopStrategy.isActive,
            balanceOf: aaveLoopStrategy.balanceOf.toString(),
          },
          stableLp: {
            name: STRATEGY_CONFIG.stableLp.name,
            address: V3_CONTRACTS.stableLpStrategy,
            apy: stableLpStrategy.apyFormatted || '12-25',
            apyRange: STRATEGY_CONFIG.stableLp.expectedApy,
            risk: STRATEGY_CONFIG.stableLp.risk,
            description: STRATEGY_CONFIG.stableLp.description,
            allocation: STRATEGY_CONFIG.stableLp.allocation,
            isActive: stableLpStrategy.isActive,
            balanceOf: stableLpStrategy.balanceOf.toString(),
          },
        },

        // Strategy Controller
        strategyController: {
          address: V3_CONTRACTS.strategyController,
          totalAllocation: 10000, // 100%
        },

        // Network info
        network: {
          name: 'Polygon Mainnet',
          chainId: 137,
          gasPrice: Number(gasPrice) / 1e9, // Convert to Gwei
          rpc: 'https://polygon-rpc.com',
        },

        // Protocol status
        status: {
          isPaused,
          lastUpdated: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching protocol data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch blockchain data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
