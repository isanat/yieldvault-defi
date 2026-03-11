'use client'

import { useQuery } from '@tanstack/react-query'

export interface UserData {
  address: string
  vault: {
    shares: string
    sharesFormatted: string
    assets: string
    assetsFormatted: string
    userInfo: {
      deposited: string
      depositedFormatted: string
      withdrawn: string
      withdrawnFormatted: string
      rewards: string
      rewardsFormatted: string
    } | null
  }
  balance: {
    usdt: string
    usdtFormatted: string
  }
  referral: {
    code: string
    referrer: string
    totalEarnings: string
    earningsFormatted: string
    directReferrals: number
    totalReferrals: number
  } | null
  summary: {
    totalDeposited: string
    totalWithdrawn: string
    currentBalance: string
    totalEarnings: string
    referralEarnings: string
  }
}

export function useUserData(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ['user', address],
    queryFn: async (): Promise<UserData | null> => {
      if (!address) return null

      const response = await fetch(`/api/user?address=${address}`)
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user data')
      }
      return data.data
    },
    enabled: !!address,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

export default useUserData
