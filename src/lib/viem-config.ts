import { createPublicClient, http, Chain, fallback } from 'viem';
import { polygon, polygonAmoy } from 'viem/chains';

// Chain configuration - Polygon Mainnet by default (Chain ID: 137)
export const CHAIN: Chain = process.env.NEXT_PUBLIC_CHAIN_ID === '80002' ? polygonAmoy : polygon;

// Lista de RPCs para Polygon Mainnet que FUNCIONAM com CORS
// Testados e confirmados para uso no frontend/backend
const POLYGON_RPC_URLS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.meowrpc.com',
  'https://polygon.drpc.org',
  'https://1rpc.io/matic',
  'https://rpc.ankr.com/polygon',
  'https://matic-mainnet.chainstacklabs.com',
  'https://polygon-rpc.com', // Fallback
];

// Lista de RPCs para Polygon Amoy (testnet)
const AMOY_RPC_URLS = [
  'https://polygon-amoy-bor-rpc.publicnode.com',
  'https://rpc-amoy.polygon.technology',
];

// Função para criar transporte com fallback
function createFallbackTransport(urls: string[]) {
  const transports = urls.map(url => 
    http(url, {
      timeout: 15_000, // 15 segundos timeout
      retryCount: 2,
      retryDelay: 1000,
    })
  );

  return fallback(transports, {
    rank: true, // Rankear por latência automaticamente
    retryCount: 3, // Número de tentativas antes de falhar
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
