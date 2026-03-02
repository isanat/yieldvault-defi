import { createPublicClient, createWalletClient, http, Address, parseAbi } from 'viem';
import { polygon, polygonMumbai } from 'viem/chains';

// Contract ABIs (simplified versions for core functions)
const VAULT_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)',
  'function balanceOf(address owner) view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function pricePerShare() view returns (uint256)',
  'function asset() view returns (address)',
]);

const REFERRAL_ABI = parseAbi([
  'function registerReferrer(address referrer) external',
  'function getReferrer(address user) view returns (address)',
  'function getReferralCount(address referrer) view returns (uint256)',
  'function getCommissions(address user) view returns (uint256)',
  'function claimCommissions() external returns (uint256)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

// Chain configuration
const chain = process.env.NODE_ENV === 'development' ? polygonMumbai : polygon;
const rpcUrl = process.env.NODE_ENV === 'development' 
  ? (process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com')
  : (process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');

// Create public client for reading
export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

// Create wallet client for writing (requires private key)
export function createWalletClientFromPrivateKey(privateKey: `0x${string}`) {
  return createWalletClient({
    chain,
    transport: http(rpcUrl),
    account: privateKey,
  });
}

// Contract addresses from environment
export const getContractAddresses = () => ({
  vault: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '') as Address,
  referral: (process.env.NEXT_PUBLIC_REFERRAL_ADDRESS || '') as Address,
  config: (process.env.NEXT_PUBLIC_CONFIG_ADDRESS || '') as Address,
});

// Vault contract interactions
export const vaultContract = {
  async getTotalAssets(): Promise<bigint> {
    const addresses = getContractAddresses();
    if (!addresses.vault) return BigInt(0);
    return publicClient.readContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: 'totalAssets',
    }) as Promise<bigint>;
  },

  async getPricePerShare(): Promise<bigint> {
    const addresses = getContractAddresses();
    if (!addresses.vault) return BigInt(10 ** 18); // Default 1:1
    return publicClient.readContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: 'pricePerShare',
    }) as Promise<bigint>;
  },

  async balanceOf(address: Address): Promise<bigint> {
    const addresses = getContractAddresses();
    if (!addresses.vault) return BigInt(0);
    return publicClient.readContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: 'balanceOf',
      args: [address],
    }) as Promise<bigint>;
  },

  async convertToShares(assets: bigint): Promise<bigint> {
    const addresses = getContractAddresses();
    if (!addresses.vault) return assets;
    return publicClient.readContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: 'convertToShares',
      args: [assets],
    }) as Promise<bigint>;
  },

  async convertToAssets(shares: bigint): Promise<bigint> {
    const addresses = getContractAddresses();
    if (!addresses.vault) return shares;
    return publicClient.readContract({
      address: addresses.vault,
      abi: VAULT_ABI,
      functionName: 'convertToAssets',
      args: [shares],
    }) as Promise<bigint>;
  },
};

// ERC20 contract interactions
export const erc20Contract = {
  async balanceOf(tokenAddress: Address, userAddress: Address): Promise<bigint> {
    return publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }) as Promise<bigint>;
  },

  async allowance(tokenAddress: Address, owner: Address, spender: Address): Promise<bigint> {
    return publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, spender],
    }) as Promise<bigint>;
  },

  async decimals(tokenAddress: Address): Promise<number> {
    const result = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return Number(result);
  },

  async symbol(tokenAddress: Address): Promise<string> {
    return publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol',
    }) as Promise<string>;
  },
};

// Referral contract interactions
export const referralContract = {
  async getReferrer(userAddress: Address): Promise<Address> {
    const addresses = getContractAddresses();
    if (!addresses.referral) return '0x0000000000000000000000000000000000000000';
    return publicClient.readContract({
      address: addresses.referral,
      abi: REFERRAL_ABI,
      functionName: 'getReferrer',
      args: [userAddress],
    }) as Promise<Address>;
  },

  async getReferralCount(referrerAddress: Address): Promise<bigint> {
    const addresses = getContractAddresses();
    if (!addresses.referral) return BigInt(0);
    return publicClient.readContract({
      address: addresses.referral,
      abi: REFERRAL_ABI,
      functionName: 'getReferralCount',
      args: [referrerAddress],
    }) as Promise<bigint>;
  },

  async getCommissions(userAddress: Address): Promise<bigint> {
    const addresses = getContractAddresses();
    if (!addresses.referral) return BigInt(0);
    return publicClient.readContract({
      address: addresses.referral,
      abi: REFERRAL_ABI,
      functionName: 'getCommissions',
      args: [userAddress],
    }) as Promise<bigint>;
  },
};
