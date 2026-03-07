'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, createConfig, fallback } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { polygon, polygonAmoy } from 'wagmi/chains';

// Create query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 30000, // 30 segundos
      refetchOnWindowFocus: false,
    },
  },
});

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '9a9a4ec5bde3ebded3da0745fbb6cad3';

// Lista de RPCs para Polygon Mainnet com fallback automático
const POLYGON_RPC_URLS = [
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
  'https://polygon.rpc.blxrbdn.com',
  'https://polygon.blockpi.network/v1/rpc/public',
  'https://polygon-rpc.com', // Original como último fallback
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
      timeout: 15_000,
      retryCount: 2,
      retryDelay: 1000,
    })
  );

  return fallback(transports, {
    rank: true, // Rankear por latência automaticamente
    retryCount: 3,
    retryDelay: 1000,
  });
}

// Create wagmi config with multi-RPC fallback
const config = createConfig({
  chains: [polygon, polygonAmoy],
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({ projectId, showQrModal: true }),
    coinbaseWallet({
      appName: 'YieldVault DeFi',
    }),
  ],
  transports: {
    [polygon.id]: createFallbackTransport(POLYGON_RPC_URLS),
    [polygonAmoy.id]: createFallbackTransport(AMOY_RPC_URLS),
  },
  ssr: true,
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Export config for use in other components
export { config };

// Export RPC endpoints for reference
export const RPC_ENDPOINTS = {
  polygon: POLYGON_RPC_URLS,
  amoy: AMOY_RPC_URLS,
};
