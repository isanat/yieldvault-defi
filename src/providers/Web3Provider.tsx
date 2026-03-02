'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { polygon, polygonAmoy } from 'wagmi/chains';

// Create query client
const queryClient = new QueryClient();

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '9a9a4ec5bde3ebded3da0745fbb6cad3';

// Create wagmi config
const config = createConfig({
  chains: [polygonAmoy, polygon],
  connectors: [
    injected({ target: 'metaMask' }),
    walletConnect({ projectId, showQrModal: true }),
  ],
  transports: {
    [polygonAmoy.id]: http('https://rpc-amoy.polygon.technology'),
    [polygon.id]: http('https://polygon-rpc.com'),
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
