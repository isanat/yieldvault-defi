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
  isMumbai: boolean;
  switchToPolygon: () => Promise<void>;
  switchToMumbai: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const POLYGON_CHAIN_ID = 137;
const MUMBAI_CHAIN_ID = 80001;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // Check if on correct chain (Mumbai for testing, Polygon for production)
  const isMumbai = chainId === MUMBAI_CHAIN_ID;
  const isPolygon = chainId === POLYGON_CHAIN_ID;
  const isCorrectChain = isMumbai || isPolygon;

  const connect = useCallback(async () => {
    try {
      // Find available connector (MetaMask, WalletConnect, etc.)
      const connector = connectors.find(c => c.ready) || connectors[0];
      
      if (!connector) {
        throw new Error('No wallet found. Please install MetaMask or use WalletConnect.');
      }
      
      await connectAsync({ connector });
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
      await switchChainAsync?.({ chainId: POLYGON_CHAIN_ID });
    } catch (error) {
      console.error('Failed to switch to Polygon:', error);
      throw error;
    }
  }, [switchChainAsync]);

  const switchToMumbai = useCallback(async () => {
    try {
      await switchChainAsync?.({ chainId: MUMBAI_CHAIN_ID });
    } catch (error) {
      console.error('Failed to switch to Mumbai:', error);
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
        isMumbai,
        switchToPolygon,
        switchToMumbai,
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
