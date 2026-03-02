'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAccount, useDisconnect, useChainId, useSwitchChain, useConnect } from 'wagmi';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  chainId: number | null;
  isCorrectChain: boolean;
  isAmoy: boolean;
  isPolygon: boolean;
  switchToPolygon: () => Promise<void>;
  switchToAmoy: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const POLYGON_CHAIN_ID = 137;
const AMOY_CHAIN_ID = 80002;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check if on correct chain
  const isAmoy = chainId === AMOY_CHAIN_ID;
  const isPolygon = chainId === POLYGON_CHAIN_ID;
  const isCorrectChain = isAmoy || isPolygon;

  // Handle connection errors - log only, don't set state in effect
  useEffect(() => {
    if (error) {
      console.error('Wallet connection error:', error);
    }
  }, [error]);

  const handleConnect = useCallback(() => {
    setConnectionError(null);
    // Find injected connector (MetaMask, etc.)
    const connector = connectors.find(c => c.id === 'injected' || c.name === 'MetaMask');
    if (connector) {
      connect({ connector });
    } else {
      // Try any available connector
      const anyConnector = connectors[0];
      if (anyConnector) {
        connect({ connector: anyConnector });
      } else {
        alert('No wallet detected. Please install MetaMask.');
      }
    }
  }, [connectors, connect]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const switchToPolygon = useCallback(async () => {
    try {
      await switchChainAsync?.({ chainId: POLYGON_CHAIN_ID });
    } catch (error) {
      console.error('Failed to switch to Polygon:', error);
    }
  }, [switchChainAsync]);

  const switchToAmoy = useCallback(async () => {
    try {
      await switchChainAsync?.({ chainId: AMOY_CHAIN_ID });
    } catch (error) {
      console.error('Failed to switch to Amoy:', error);
    }
  }, [switchChainAsync]);

  return (
    <WalletContext.Provider
      value={{
        address: address || null,
        isConnected,
        isConnecting: isPending,
        connect: handleConnect,
        disconnect,
        chainId: chainId || null,
        isCorrectChain,
        isAmoy,
        isPolygon,
        switchToPolygon,
        switchToAmoy,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
