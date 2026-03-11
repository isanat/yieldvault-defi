import { NextRequest, NextResponse } from 'next/server'
import {
  V3_CONTRACTS,
  getUserInfo,
  getReferralInfo,
  getUserUSDTBalance,
  getUserVaultShares,
  convertToAssets,
} from '@/lib/blockchain'
import { formatUnits } from 'viem'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address parameter is required' },
        { status: 400 }
      )
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      )
    }

    const userAddress = address as `0x${string}`

    // Fetch all user data in parallel
    const [userInfo, referralInfo, usdtBalance, vaultShares] = await Promise.all([
      getUserInfo(userAddress),
      getReferralInfo(userAddress),
      getUserUSDTBalance(userAddress),
      getUserVaultShares(userAddress),
    ])

    // Calculate user's assets value
    let assetsValue = BigInt(0)
    if (vaultShares > 0) {
      assetsValue = await convertToAssets(vaultShares)
    }

    return NextResponse.json({
      success: true,
      data: {
        address: userAddress,

        // Vault positions
        vault: {
          shares: vaultShares.toString(),
          sharesFormatted: formatUnits(vaultShares, 6),
          assets: assetsValue.toString(),
          assetsFormatted: formatUnits(assetsValue, 6),
          userInfo: userInfo ? {
            deposited: userInfo.deposited.toString(),
            depositedFormatted: userInfo.depositedFormatted,
            withdrawn: userInfo.withdrawn.toString(),
            withdrawnFormatted: userInfo.withdrawnFormatted,
            rewards: userInfo.rewards.toString(),
            rewardsFormatted: userInfo.rewardsFormatted,
          } : null,
        },

        // USDT balance
        balance: {
          usdt: usdtBalance.toString(),
          usdtFormatted: formatUnits(usdtBalance, 6),
        },

        // Referral info
        referral: referralInfo ? {
          code: referralInfo.code,
          referrer: referralInfo.referrer,
          totalEarnings: referralInfo.totalEarnings.toString(),
          earningsFormatted: referralInfo.earningsFormatted,
          directReferrals: Number(referralInfo.directReferrals),
          totalReferrals: Number(referralInfo.totalReferrals),
        } : null,

        // Summary
        summary: {
          totalDeposited: userInfo?.depositedFormatted || '0',
          totalWithdrawn: userInfo?.withdrawnFormatted || '0',
          currentBalance: formatUnits(assetsValue, 6),
          totalEarnings: userInfo?.rewardsFormatted || '0',
          referralEarnings: referralInfo?.earningsFormatted || '0',
        },
      },
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch user data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
