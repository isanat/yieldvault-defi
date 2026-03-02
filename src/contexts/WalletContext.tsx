'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useAccount, useDisconnect, useChainId, useSwitchChain, useConnect } from 'wagmi';
import { polygon, polygonAmoy } from 'wagmi/chains';

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
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // Check if on correct chain (Amoy for testing, Polygon for production)
  const isAmoy = chainId === AMOY_CHAIN_ID;
  const isPolygon = chainId === POLYGON_CHAIN_ID;
  const isCorrectChain = isAmoy || isPolygon;

  const handleConnect = useCallback(() => {
    // Find the injected connector (MetaMask)
    const injectedConnector = connectors.find(c => c.id === 'injected' || c.id === 'io.metamask');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    } else {
      // Fallback to first available connector
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
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
      throw error;
    }
  }, [switchChainAsync]);

  const switchToAmoy = useCallback(async () => {
    try {
      await switchChainAsync?.({ chainId: AMOY_CHAIN_ID });
    } catch (error) {
      console.error('Failed to switch to Amoy:', error);
      throw error;
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
