'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonAmoy } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

// Create query client
const queryClient = new QueryClient();

// WalletConnect Project ID - Get yours at https://cloud.reown.com/
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'b5a5f5a5f5a5f5a5f5a5f5a5f5a5f5a5';

// Create wagmi config
const config = getDefaultConfig({
  appName: 'YieldVault DeFi',
  projectId,
  chains: [polygonAmoy, polygon], // Amoy first for testing
  ssr: true,
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={polygonAmoy}
          theme={darkTheme({
            accentColor: '#7c3aed',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Export config for use in other components
export { config };
