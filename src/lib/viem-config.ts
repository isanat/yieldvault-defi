import { createPublicClient, http, Chain } from 'viem';
import { polygon, polygonMumbai } from 'viem/chains';

// Chain configuration
export const CHAIN: Chain = process.env.NEXT_PUBLIC_CHAIN_ID === '137' ? polygon : polygonMumbai;

// RPC URL
const RPC_URL = process.env.NEXT_PUBLIC_CHAIN_ID === '137'
  ? (process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com')
  : (process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com');

// Public client for reading
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

// Re-export for convenience
export { polygon, polygonMumbai };
