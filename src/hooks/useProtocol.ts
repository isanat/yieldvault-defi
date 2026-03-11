'use client'

import { useQuery } from '@tanstack/react-query'

export interface ProtocolData {
  contracts: Record<string, string>
  stats: {
    tvl: string
    tvlFormatted: string
    users: number
    avgAPY: string
    totalPaidOut: string
    totalSupply: string
  }
  fees: {
    performanceFeeBP: number
    depositFeeBP: number
    managementFeeBP: number
    withdrawalFeeBP: number
  }
  referralRates: number[]
  strategies: {
    aave: {
      name: string
      address: string
      apy: string
      apyRange: string
      risk: string
      isActive: boolean
      balanceOf: string
    }
    quickswap: {
      name: string
      address: string
      apy: string
      apyRange: string
      risk: string
      isActive: boolean
      balanceOf: string
    }
  }
  network: {
    name: string
    chainId: number
    gasPrice: number
    rpc: string
  }
  status: {
    isPaused: boolean
    lastUpdated: string
  }
}

export function useProtocolData() {
  return useQuery({
    queryKey: ['protocol'],
    queryFn: async (): Promise<ProtocolData> => {
      const response = await fetch('/api/protocol')
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch protocol data')
      }
      return data.data
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

export default useProtocolData
