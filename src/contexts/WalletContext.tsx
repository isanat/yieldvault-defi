'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { polygon, polygonMumbai } from 'wagmi/chains';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
  isCorrectChain: boolean;
  switchToPolygon: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const POLYGON_CHAIN_ID = 137; // Polygon mainnet
const MUMBAI_CHAIN_ID = 80001; // Polygon Mumbai testnet

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const isCorrectChain = chainId === POLYGON_CHAIN_ID || chainId === MUMBAI_CHAIN_ID;

  const connect = useCallback(async () => {
    try {
      // Use the first available connector (usually injected/MetaMask)
      const connector = connectors[0];
      if (connector) {
        await connectAsync({ connector });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, [connectors, connectAsync]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const switchToPolygon = useCallback(async () => {
    try {
      const targetChain = process.env.NODE_ENV === 'development' ? polygonMumbai : polygon;
      await switchChainAsync?.({ chainId: targetChain.id });
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw error;
    }
  }, [switchChainAsync]);

  return (
    <WalletContext.Provider
      value={{
        address: address || null,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        chainId: chainId || null,
        isCorrectChain,
        switchToPolygon,
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
