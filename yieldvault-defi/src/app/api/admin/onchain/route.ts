import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { polygon } from 'wagmi/chains';

// Contract ABIs
const CONFIG_ABI = [
  {
    name: 'performanceFeeBP',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'depositFeeBP',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'managementFeeBP',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'depositsEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'withdrawalsEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'harvestEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getReferralRates',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256[5]' }],
  },
  {
    name: 'treasury',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

const VAULT_ABI = [
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getStrategies',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { type: 'address[]' },
      { type: 'uint256[]' },
    ],
  },
  {
    name: 'lastHarvestTimestamp',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalProfitHarvested',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Contract addresses
const CONFIG_ADDRESS = (process.env.NEXT_PUBLIC_CONFIG_ADDRESS || '0xAe4F3AD2e7f4d3DFE18FB0E852e3CEE0bF3F7c13') as `0x${string}`;
const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x271Ab56dD3C2EE5b8d268aA56c1DB510b1402EcF') as `0x${string}`;

// RPC URLs with fallback
const RPC_URLS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://1rpc.io/matic',
  'https://rpc.ankr.com/polygon',
];

// Admin authentication
const ADMIN_ADDRESSES = (process.env.ADMIN_ADDRESSES || '').toLowerCase().split(',');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

function verifyAdmin(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return ADMIN_ADDRESSES.includes(token.toLowerCase()) || token === ADMIN_API_KEY;
}

// Create viem client with fallback RPCs
function createClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(RPC_URLS[0]),
  });
}

/**
 * GET /api/admin/onchain
 * Fetch real blockchain data for admin dashboard
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!verifyAdmin(authHeader)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const client = createClient();

    // Fetch all config data in parallel
    const [
      performanceFeeBP,
      depositFeeBP,
      managementFeeBP,
      depositsEnabled,
      withdrawalsEnabled,
      harvestEnabled,
      referralRates,
      treasury,
      totalAssets,
      totalSupply,
      lastHarvestTimestamp,
      totalProfitHarvested,
      strategiesData,
    ] = await Promise.all([
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'performanceFeeBP',
      }),
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'depositFeeBP',
      }),
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'managementFeeBP',
      }),
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'depositsEnabled',
      }),
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'withdrawalsEnabled',
      }),
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'harvestEnabled',
      }),
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'getReferralRates',
      }),
      client.readContract({
        address: CONFIG_ADDRESS,
        abi: CONFIG_ABI,
        functionName: 'treasury',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'totalAssets',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'totalSupply',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'lastHarvestTimestamp',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'totalProfitHarvested',
      }),
      client.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'getStrategies',
      }),
    ]);

    // Format referral rates
    const rates = referralRates as bigint[];
    const formattedReferralRates = {
      level1: Number(rates[0]) / 100,
      level2: Number(rates[1]) / 100,
      level3: Number(rates[2]) / 100,
      level4: Number(rates[3]) / 100,
      level5: Number(rates[4]) / 100,
    };

    // Format strategies
    const [strategyAddresses, allocations] = strategiesData as [readonly `0x${string}`[], readonly bigint[]];
    const strategies = strategyAddresses.map((address, index) => ({
      address,
      allocation: Number(allocations[index]) / 100,
    }));

    // Calculate TVL in USDT (6 decimals)
    const tvl = Number(totalAssets) / 1e6;
    const totalShares = Number(totalSupply) / 1e18;
    const totalProfit = Number(totalProfitHarvested) / 1e6;

    const response = {
      success: true,
      data: {
        config: {
          performanceFeeBP: Number(performanceFeeBP),
          depositFeeBP: Number(depositFeeBP),
          managementFeeBP: Number(managementFeeBP),
          depositsEnabled,
          withdrawalsEnabled,
          harvestEnabled,
          referralRates: formattedReferralRates,
          treasury,
        },
        vault: {
          totalAssets: tvl,
          totalSupply: totalShares,
          lastHarvestTimestamp: lastHarvestTimestamp > 0n ? new Date(Number(lastHarvestTimestamp) * 1000) : null,
          totalProfitHarvested: totalProfit,
          strategies,
        },
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching on-chain data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch blockchain data',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
