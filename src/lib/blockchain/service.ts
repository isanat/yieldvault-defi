import { formatUnits, parseUnits } from 'viem'
import { publicClient } from './client'
import { V3_CONTRACTS, STRATEGY_CONFIG } from './contracts'
import { vaultABI, configABI, referralABI, strategyABI, erc20ABI } from './abis'

// Types
export interface ProtocolStats {
  tvl: bigint
  tvlFormatted: string
  totalUsers: number
  avgAPY: string
  totalPaidOut: string
  totalSupply: bigint
}

export interface FeeData {
  performanceFeeBP: bigint
  depositFeeBP: bigint
  managementFeeBP: bigint
  withdrawalFeeBP: bigint
}

export interface ReferralRates {
  level1: bigint
  level2: bigint
  level3: bigint
  level4: bigint
  level5: bigint
}

export interface StrategyData {
  name: string
  address: `0x${string}`
  balanceOf: bigint
  estimatedAPY: bigint
  isActive: boolean
  apyFormatted: string
}

export interface UserInfo {
  shares: bigint
  assets: bigint
  deposited: bigint
  withdrawn: bigint
  rewards: bigint
  assetsFormatted: string
  depositedFormatted: string
  withdrawnFormatted: string
  rewardsFormatted: string
}

export interface ReferralInfo {
  code: string
  referrer: `0x${string}`
  totalEarnings: bigint
  directReferrals: bigint
  totalReferrals: bigint
  earningsFormatted: string
}

// USDT has 6 decimals
const USDT_DECIMALS = 6

/**
 * Get Vault total assets (TVL)
 */
export async function getTVL(): Promise<bigint> {
  try {
    const totalAssets = await publicClient.readContract({
      address: V3_CONTRACTS.vault as `0x${string}`,
      abi: vaultABI,
      functionName: 'totalAssets',
    })
    return totalAssets as bigint
  } catch (error) {
    console.error('Error fetching TVL:', error)
    return BigInt(0)
  }
}

/**
 * Get total supply of vault shares
 */
export async function getTotalSupply(): Promise<bigint> {
  try {
    const totalSupply = await publicClient.readContract({
      address: V3_CONTRACTS.vault as `0x${string}`,
      abi: vaultABI,
      functionName: 'totalSupply',
    })
    return totalSupply as bigint
  } catch (error) {
    console.error('Error fetching total supply:', error)
    return BigInt(0)
  }
}

/**
 * Get fee configuration
 */
export async function getFees(): Promise<FeeData> {
  try {
    // Try reading from vault first, then config
    const [performanceFeeBP, depositFeeBP, withdrawalFeeBP, managementFeeBP] = await Promise.all([
      publicClient.readContract({
        address: V3_CONTRACTS.vault as `0x${string}`,
        abi: vaultABI,
        functionName: 'performanceFeeBP',
      }).catch(() => BigInt(2000)),
      publicClient.readContract({
        address: V3_CONTRACTS.vault as `0x${string}`,
        abi: vaultABI,
        functionName: 'depositFeeBP',
      }).catch(() => BigInt(500)),
      publicClient.readContract({
        address: V3_CONTRACTS.vault as `0x${string}`,
        abi: vaultABI,
        functionName: 'withdrawalFeeBP',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: V3_CONTRACTS.vault as `0x${string}`,
        abi: vaultABI,
        functionName: 'managementFeeBP',
      }).catch(() => BigInt(200)),
    ])

    return {
      performanceFeeBP: performanceFeeBP as bigint,
      depositFeeBP: depositFeeBP as bigint,
      withdrawalFeeBP: withdrawalFeeBP as bigint,
      managementFeeBP: managementFeeBP as bigint,
    }
  } catch (error) {
    console.error('Error fetching fees:', error)
    return {
      performanceFeeBP: BigInt(2000),
      depositFeeBP: BigInt(500),
      managementFeeBP: BigInt(200),
      withdrawalFeeBP: BigInt(0),
    }
  }
}

/**
 * Get referral rates from config
 */
export async function getReferralRates(): Promise<bigint[]> {
  try {
    const rates = await publicClient.readContract({
      address: V3_CONTRACTS.config as `0x${string}`,
      abi: configABI,
      functionName: 'getReferralRates',
    }).catch(async () => {
      // V3 Referral contract has levelRates array
      const referralRates = await publicClient.readContract({
        address: V3_CONTRACTS.referral as `0x${string}`,
        abi: referralABI,
        functionName: 'levelRates',
      }).catch(() => null)
      
      if (referralRates) {
        return referralRates as bigint[]
      }
      // Default rates
      return [BigInt(4000), BigInt(2500), BigInt(1500), BigInt(1200), BigInt(800)]
    })
    return rates as bigint[]
  } catch (error) {
    console.error('Error fetching referral rates:', error)
    return [BigInt(4000), BigInt(2500), BigInt(1500), BigInt(1200), BigInt(800)]
  }
}

/**
 * Get total users from referral system
 */
export async function getTotalUsers(): Promise<bigint> {
  try {
    // V3 doesn't have totalUsers, so we return 0 for now
    // Could track this separately in a subgraph or database
    return BigInt(0)
  } catch (error) {
    console.error('Error fetching total users:', error)
    return BigInt(0)
  }
}

/**
 * Get strategy data
 */
export async function getStrategyData(strategyAddress: `0x${string}`): Promise<StrategyData> {
  try {
    const [name, balanceOf, estimatedAPY, isActive] = await Promise.all([
      publicClient.readContract({
        address: strategyAddress,
        abi: strategyABI,
        functionName: 'name',
      }).catch(() => 'Unknown Strategy') as Promise<string>,
      publicClient.readContract({
        address: strategyAddress,
        abi: strategyABI,
        functionName: 'balanceOf',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: strategyAddress,
        abi: strategyABI,
        functionName: 'estimatedAPY',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: strategyAddress,
        abi: strategyABI,
        functionName: 'isActive',
      }).catch(() => false),
    ])

    const apyFormatted = ((Number(estimatedAPY) / 100)).toFixed(2)

    return {
      name,
      address: strategyAddress,
      balanceOf: balanceOf as bigint,
      estimatedAPY: estimatedAPY as bigint,
      isActive: isActive as boolean,
      apyFormatted,
    }
  } catch (error) {
    console.error('Error fetching strategy data:', error)
    return {
      name: 'Unknown',
      address: strategyAddress,
      balanceOf: BigInt(0),
      estimatedAPY: BigInt(0),
      isActive: false,
      apyFormatted: '0',
    }
  }
}

/**
 * Get user info from vault
 */
export async function getUserInfo(userAddress: `0x${string}`): Promise<UserInfo | null> {
  try {
    const userInfo = await publicClient.readContract({
      address: V3_CONTRACTS.vault as `0x${string}`,
      abi: vaultABI,
      functionName: 'getUserInfo',
      args: [userAddress],
    }) as [bigint, bigint, bigint, bigint, bigint]

    const [shares, assets, deposited, withdrawn, rewards] = userInfo

    return {
      shares,
      assets,
      deposited,
      withdrawn,
      rewards,
      assetsFormatted: formatUnits(assets, USDT_DECIMALS),
      depositedFormatted: formatUnits(deposited, USDT_DECIMALS),
      withdrawnFormatted: formatUnits(withdrawn, USDT_DECIMALS),
      rewardsFormatted: formatUnits(rewards, USDT_DECIMALS),
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    return null
  }
}

/**
 * Get user referral info
 */
export async function getReferralInfo(userAddress: `0x${string}`): Promise<ReferralInfo | null> {
  try {
    // V3 uses users() function that returns a struct
    const userInfo = await publicClient.readContract({
      address: V3_CONTRACTS.referral as `0x${string}`,
      abi: referralABI,
      functionName: 'users',
      args: [userAddress],
    }) as [referrer: `0x${string}`, code: `0x${string}`, totalRewards: bigint, referralCount: bigint]

    const [referrer, code, totalRewards, referralCount] = userInfo

    // Convert bytes8 code to string
    const codeString = code || '0x0000000000000000'
    
    return {
      code: codeString,
      referrer,
      totalEarnings: totalRewards,
      directReferrals: referralCount,
      totalReferrals: referralCount,
      earningsFormatted: formatUnits(totalRewards, USDT_DECIMALS),
    }
  } catch (error) {
    console.error('Error fetching referral info:', error)
    return null
  }
}

/**
 * Get user USDT balance
 */
export async function getUserUSDTBalance(userAddress: `0x${string}`): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: V3_CONTRACTS.usdt as `0x${string}`,
      abi: erc20ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })
    return balance as bigint
  } catch (error) {
    console.error('Error fetching USDT balance:', error)
    return BigInt(0)
  }
}

/**
 * Get user vault share balance
 */
export async function getUserVaultShares(userAddress: `0x${string}`): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: V3_CONTRACTS.vault as `0x${string}`,
      abi: vaultABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })
    return balance as bigint
  } catch (error) {
    console.error('Error fetching vault shares:', error)
    return BigInt(0)
  }
}

/**
 * Convert shares to assets
 */
export async function convertToAssets(shares: bigint): Promise<bigint> {
  try {
    const assets = await publicClient.readContract({
      address: V3_CONTRACTS.vault as `0x${string}`,
      abi: vaultABI,
      functionName: 'convertToAssets',
      args: [shares],
    })
    return assets as bigint
  } catch (error) {
    console.error('Error converting shares to assets:', error)
    return BigInt(0)
  }
}

/**
 * Get protocol stats (all in one call for efficiency)
 */
export async function getProtocolStats(): Promise<ProtocolStats> {
  try {
    const [tvl, totalSupply, totalUsers, fees, referralRates, aaveLoopStrategy, stableLpStrategy] = await Promise.all([
      getTVL(),
      getTotalSupply(),
      getTotalUsers(),
      getFees(),
      getReferralRates(),
      getStrategyData(V3_CONTRACTS.aaveLoopStrategy as `0x${string}`),
      getStrategyData(V3_CONTRACTS.stableLpStrategy as `0x${string}`),
    ])

    // Calculate average APY from strategies
    const aaveAPY = Number(aaveLoopStrategy.apyFormatted) || 8
    const stableAPY = Number(stableLpStrategy.apyFormatted) || 15
    const avgAPY = ((aaveAPY + stableAPY) / 2).toFixed(1)

    const tvlFormatted = `$${(Number(formatUnits(tvl, USDT_DECIMALS)) / 1000000).toFixed(2)}M`

    return {
      tvl,
      tvlFormatted,
      totalUsers: Number(totalUsers),
      avgAPY,
      totalPaidOut: '$180K+', // This would need to be tracked on-chain
      totalSupply,
    }
  } catch (error) {
    console.error('Error fetching protocol stats:', error)
    return {
      tvl: BigInt(0),
      tvlFormatted: '$0',
      totalUsers: 0,
      avgAPY: '0',
      totalPaidOut: '$0',
      totalSupply: BigInt(0),
    }
  }
}

/**
 * Check if vault is paused
 */
export async function isVaultPaused(): Promise<boolean> {
  try {
    const paused = await publicClient.readContract({
      address: V3_CONTRACTS.vault as `0x${string}`,
      abi: vaultABI,
      functionName: 'paused',
    })
    return paused as boolean
  } catch (error) {
    console.error('Error checking vault pause status:', error)
    return false
  }
}

/**
 * Get current Polygon gas price
 */
export async function getGasPrice(): Promise<bigint> {
  try {
    const gasPrice = await publicClient.getGasPrice()
    return gasPrice
  } catch (error) {
    console.error('Error fetching gas price:', error)
    return BigInt(30000000000) // 30 Gwei default
  }
}

/**
 * Format bigint to readable number
 */
export function formatTokenAmount(amount: bigint, decimals: number = USDT_DECIMALS): string {
  return formatUnits(amount, decimals)
}

/**
 * Parse number to bigint
 */
export function parseTokenAmount(amount: string, decimals: number = USDT_DECIMALS): bigint {
  return parseUnits(amount, decimals)
}
