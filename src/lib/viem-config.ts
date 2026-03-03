import { createPublicClient, http, Chain } from 'viem';
import { polygon, polygonAmoy } from 'viem/chains';

// Chain configuration - Polygon Mainnet by default (Chain ID: 137)
export const CHAIN: Chain = process.env.NEXT_PUBLIC_CHAIN_ID === '80002' ? polygonAmoy : polygon;

// RPC URLs - Multiple options for Polygon Mainnet
const POLYGON_RPC_URLS = [
  process.env.POLYGON_RPC_URL,
  'https://polygon-rpc.com',
  'https://polygon-mainnet.public.blastapi.io',
  'https://polygon.blockpi.network/v1/rpc/public',
].filter(Boolean);

const AMOY_RPC_URLS = [
  process.env.AMOY_RPC_URL,
  'https://rpc-amoy.polygon.technology',
].filter(Boolean);

// RPC URL
const RPC_URL = process.env.NEXT_PUBLIC_CHAIN_ID === '80002'
  ? AMOY_RPC_URLS[0]
  : POLYGON_RPC_URLS[0];

// Public client for reading
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

// Re-export for convenience
export { polygon, polygonAmoy };
