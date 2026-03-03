import { getContract, Address } from 'viem';
import { publicClient, walletClient, CHAIN } from './viem-config';

// Contract ABIs
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export const VAULT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'referrer', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
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
    name: 'sharePrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ type: 'shares', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'assets', type: 'uint256' }],
  },
  {
    name: 'getReferrer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
] as const;

export const CONFIG_ABI = [
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
    name: 'treasury',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
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
    name: 'getReferralRates',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256[5]' }],
  },
] as const;

export const STRATEGY_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'totalDeposited',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'vault',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

export const REFERRAL_ABI = [
  {
    name: 'registerReferrer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'referrer', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getReferrer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'getReferralCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'referrer', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getPendingCommissions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'claimCommissions',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
] as const;

// Contract addresses - Polygon Mainnet (hardcoded as fallback)
const POLYGON_ADDRESSES = {
  vault: '0x271Ab56dD3C2EE5b8d268aA56c1DB510b1402EcF' as Address,
  referral: '0x91aF942211B553AeecC877aEb769a48264AA742E' as Address,
  config: '0xAe4F3AD2e7f4d3DFE18FB0E852e3CEE0bF3F7c13' as Address,
  usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address,
  feeDistributor: '0x344f726a284808Ece5D4672120420Ca9f33902a4' as Address,
  aaveStrategy: '0x5c3d1339f822fb1E1Fd9886F52fDfD98CB0B0D2d' as Address,
  quickswapStrategy: '0x6894C629655Ef459Af5e779D518Decb11CC81638' as Address,
};

// Contract addresses from environment (with hardcoded fallbacks)
const getAddresses = () => ({
  vault: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || POLYGON_ADDRESSES.vault) as Address,
  referral: (process.env.NEXT_PUBLIC_REFERRAL_ADDRESS || POLYGON_ADDRESSES.referral) as Address,
  config: (process.env.NEXT_PUBLIC_CONFIG_ADDRESS || POLYGON_ADDRESSES.config) as Address,
  usdt: (process.env.NEXT_PUBLIC_USDT_ADDRESS || POLYGON_ADDRESSES.usdt) as Address,
  feeDistributor: (process.env.NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS || POLYGON_ADDRESSES.feeDistributor) as Address,
  aaveStrategy: (process.env.NEXT_PUBLIC_AAVE_STRATEGY_ADDRESS || POLYGON_ADDRESSES.aaveStrategy) as Address,
  quickswapStrategy: (process.env.NEXT_PUBLIC_QUICKSWAP_STRATEGY_ADDRESS || POLYGON_ADDRESSES.quickswapStrategy) as Address,
});

// Create contract instances
export function getERC20Contract(address: Address) {
  return getContract({
    address,
    abi: ERC20_ABI,
    client: publicClient,
  });
}

export function getVaultContract() {
  const addresses = getAddresses();
  if (!addresses.vault) return null;
  
  return getContract({
    address: addresses.vault,
    abi: VAULT_ABI,
    client: publicClient,
  });
}

export function getReferralContract() {
  const addresses = getAddresses();
  if (!addresses.referral) return null;
  
  return getContract({
    address: addresses.referral,
    abi: REFERRAL_ABI,
    client: publicClient,
  });
}

export function getConfigContract() {
  const addresses = getAddresses();
  if (!addresses.config) return null;
  
  return getContract({
    address: addresses.config,
    abi: CONFIG_ABI,
    client: publicClient,
  });
}

export function getStrategyContract(address: Address) {
  return getContract({
    address,
    abi: STRATEGY_ABI,
    client: publicClient,
  });
}

// Helper functions
export function parseUnits(value: string, decimals: number): bigint {
  return BigInt(Math.floor(parseFloat(value) * Math.pow(10, decimals)));
}

export function formatUnits(value: bigint, decimals: number): string {
  return (Number(value) / Math.pow(10, decimals)).toFixed(decimals);
}

// Check if contracts are deployed
export function areContractsDeployed(): boolean {
  const addresses = getAddresses();
  return !!(addresses.vault && addresses.referral && addresses.config);
}

// Get contract addresses for display
export { getAddresses };
