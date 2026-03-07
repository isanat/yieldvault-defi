import { createPublicClient, http, Chain, fallback } from 'viem';
import { polygon, polygonAmoy } from 'viem/chains';

// Chain configuration - Polygon Mainnet by default (Chain ID: 137)
export const CHAIN: Chain = process.env.NEXT_PUBLIC_CHAIN_ID === '80002' ? polygonAmoy : polygon;

// Lista de RPCs para Polygon Mainnet com fallback automático
// Ordem de prioridade: RPCs mais confiáveis primeiro
const POLYGON_RPC_URLS = [
  // RPCs públicos principais (mais confiáveis)
  'https://polygon-mainnet.g.alchemy.com/v2/demo',
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.meowrpc.com',
  'https://polygon.drpc.org',
  'https://1rpc.io/matic',
  'https://polygon-mainnet.public.blastapi.io',
  'https://polygon.api.onfinality.io/public',
  'https://rpc.ankr.com/polygon',
  'https://polygon.llamarpc.com',
  'https://matic-mainnet.chainstacklabs.com',
  // Fallbacks adicionais
  'https://polygon.rpc.blxrbdn.com',
  'https://polygon.blockpi.network/v1/rpc/public',
  // Original como último fallback (pode retornar 401)
  'https://polygon-rpc.com',
];

// Lista de RPCs para Polygon Amoy (testnet)
const AMOY_RPC_URLS = [
  'https://polygon-amoy.g.alchemy.com/v2/demo',
  'https://polygon-amoy-bor-rpc.publicnode.com',
  'https://polygon-amoy.blockpi.network/v1/rpc/public',
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
