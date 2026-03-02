import { createPublicClient, http, Chain } from 'viem';
import { polygon, polygonAmoy } from 'viem/chains';

// Chain configuration - Using Amoy testnet (Mumbai is deprecated)
export const CHAIN: Chain = process.env.NEXT_PUBLIC_CHAIN_ID === '137' ? polygon : polygonAmoy;

// RPC URL
const RPC_URL = process.env.NEXT_PUBLIC_CHAIN_ID === '137'
  ? (process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com')
  : (process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology');

// Public client for reading
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

// Re-export for convenience
export { polygon, polygonAmoy };
