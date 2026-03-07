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
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '9a9a4ec5bde3ebded3da0745fbb6cad3';

// Alchemy API Key
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '2iPG0kfpRgPxYyu6I4ypv';

// Ankr API Key
const ANKR_API_KEY = process.env.NEXT_PUBLIC_ANKR_API_KEY || '6673d083f45b6d93b0f631e42b72f1ab9f223195a479135ab2f882e3bcf1e2c2';

// Lista de RPCs para Polygon Mainnet com fallback automático
const POLYGON_RPC_URLS = [
  // Alchemy (prioridade com API key própria)
  `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  // Ankr Premium (API key própria)
  `https://rpc.ankr.com/multichain/${ANKR_API_KEY}`,
  // RPCs públicos com CORS habilitado
  'https://polygon-bor-rpc.publicnode.com',
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
