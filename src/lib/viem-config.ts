import { createPublicClient, http, Chain, fallback } from 'viem';
import { polygon, polygonAmoy } from 'viem/chains';

// Chain configuration - Polygon Mainnet by default (Chain ID: 137)
export const CHAIN: Chain = process.env.NEXT_PUBLIC_CHAIN_ID === '80002' ? polygonAmoy : polygon;

// Alchemy API Key
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '2iPG0kfpRgPxYyu6I4ypv';

// Ankr API Key
const ANKR_API_KEY = process.env.NEXT_PUBLIC_ANKR_API_KEY || '6673d083f45b6d93b0f631e42b72f1ab9f223195a479135ab2f882e3bcf1e2c2';

// Lista de RPCs para Polygon Mainnet com fallback automático
const POLYGON_RPC_URLS = [
  `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  `https://rpc.ankr.com/multichain/${ANKR_API_KEY}`,
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.meowrpc.com',
  'https://polygon.drpc.org',
  'https://1rpc.io/matic',
  'https://rpc.ankr.com/polygon',
];

// Lista de RPCs para Polygon Amoy (testnet)
const AMOY_RPC_URLS = [
  `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  'https://polygon-amoy-bor-rpc.publicnode.com',
  'https://rpc-amoy.polygon.technology',
];

// Função para criar transporte com fallback
function createFallbackTransport(urls: string[]) {
  const transports = urls.map(url => 
    http(url, {
      timeout: 15_000,
      retryCount: 2,
      retryDelay: 1000,
    })
  );

  return fallback(transports, {
    rank: true,
    retryCount: 3,
    retryDelay: 1000,
  });
}

// Public client for reading - com fallback automático
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: CHAIN.id === polygon.id 
    ? createFallbackTransport(POLYGON_RPC_URLS)
    : createFallbackTransport(AMOY_RPC_URLS),
});

// Export RPC URLs for reference
export const RPC_ENDPOINTS = {
  polygon: POLYGON_RPC_URLS,
  amoy: AMOY_RPC_URLS,
};

// Re-export for convenience
export { polygon, polygonAmoy };
